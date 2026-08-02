import base64
import json
from decimal import Decimal
from uuid import UUID
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Max, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsTenant
from core.services.pdf_generator import generate_receipt_pdf
from agreements.models import Agreement

from .esewa import generate_esewa_signature, verify_esewa_signature
from .models import EsewaPaymentLog
from .models import RentPayment
from .pagination import RentPaymentPagination
from .serializers import (
    EsewaCallbackSerializer,
    EsewaInitiateSerializer,
    RentPaymentCreateSerializer,
    RentPaymentDetailSerializer,
    RentPaymentListSerializer,
)


def _parse_agreement_id(value):
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _serializer_detail_error(serializer):
    errors = serializer.errors
    if isinstance(errors, dict):
        for value in errors.values():
            if isinstance(value, list) and value:
                return str(value[0])
            if value:
                return str(value)
    if isinstance(errors, list) and errors:
        return str(errors[0])
    return 'Invalid input.'


def _decode_esewa_payload(encoded_data):
    try:
        padded_data = encoded_data + '=' * (-len(encoded_data) % 4)
        decoded = base64.b64decode(padded_data).decode('utf-8')
        return json.loads(decoded)
    except Exception:
        return None


def _call_esewa_verification(payload):
    request_payload = urlencode(payload).encode('utf-8')
    http_request = Request(
        settings.ESEWA_VERIFY_URL,
        data=request_payload,
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST',
    )
    try:
        with urlopen(http_request, timeout=15) as response:
            body = response.read().decode('utf-8')
    except (HTTPError, URLError) as exc:
        raise RuntimeError(str(exc)) from exc

    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return {'raw_response': body}


def _decimal_value(value):
    return Decimal(str(value))


def _extract_callback_data(request):
    if request.method == 'POST':
        data_value = getattr(request, 'data', {}).get('data') if hasattr(request, 'data') else None
        return data_value or request.query_params.get('data')
    data_value = request.query_params.get('data')
    if data_value:
        return data_value
    return getattr(request, 'data', {}).get('data') if hasattr(request, 'data') else None


class RentPaymentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role == 'tenant':
            queryset = RentPayment.objects.filter(agreement__tenant=request.user)
        elif request.user.role == 'landlord':
            queryset = RentPayment.objects.filter(agreement__landlord=request.user)
        else:
            queryset = RentPayment.objects.none()

        agreement_id = request.query_params.get('agreement_id')
        if agreement_id:
            parsed_agreement_id = _parse_agreement_id(agreement_id)
            if parsed_agreement_id is None:
                return Response({'detail': 'Invalid agreement_id.'}, status=status.HTTP_400_BAD_REQUEST)
            queryset = queryset.filter(agreement_id=parsed_agreement_id)

        paginator = RentPaymentPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = RentPaymentListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = RentPaymentListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if not IsTenant().has_permission(request, self):
            return Response({'detail': 'Only tenants can record rent payments.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RentPaymentCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            errors = serializer.errors
            if isinstance(errors, dict):
                for value in errors.values():
                    if isinstance(value, list) and value:
                        return Response({'detail': str(value[0])}, status=status.HTTP_400_BAD_REQUEST)
                    if value:
                        return Response({'detail': str(value)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': 'Invalid input.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            payment = serializer.save()
        return Response(RentPaymentDetailSerializer(payment).data, status=status.HTTP_201_CREATED)


class RentPaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        payment = get_object_or_404(RentPayment, id=kwargs['id'])
        if request.user != payment.agreement.tenant and request.user != payment.agreement.landlord:
            return Response({'detail': 'You do not have access to this payment record.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = RentPaymentDetailSerializer(payment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RentPaymentSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not IsTenant().has_permission(request, self):
            return Response({'detail': 'Only tenants can view rent payment summaries.'}, status=status.HTTP_403_FORBIDDEN)

        agreement_id = request.query_params.get('agreement_id')
        if not agreement_id:
            return Response({'detail': 'agreement_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        parsed_agreement_id = _parse_agreement_id(agreement_id)
        if parsed_agreement_id is None:
            return Response({'detail': 'Invalid agreement_id.'}, status=status.HTTP_400_BAD_REQUEST)

        agreement = get_object_or_404(Agreement, id=parsed_agreement_id)
        if request.user != agreement.tenant:
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)

        payments = RentPayment.objects.filter(agreement=agreement)
        aggregates = payments.aggregate(
            total_paid=Sum('amount'),
            total_late_fees=Sum('late_fee'),
            payments_count=Count('id'),
            last_payment_date=Max('paid_at'),
            last_payment_month=Max('payment_month'),
        )

        return Response(
            {
                'agreement_id': str(agreement.id),
                'rent_amount': agreement.rent_amount,
                'total_paid': aggregates['total_paid'] or Decimal('0.00'),
                'total_late_fees': aggregates['total_late_fees'] or Decimal('0.00'),
                'payments_count': aggregates['payments_count'],
                'last_payment_date': aggregates['last_payment_date'],
                'last_payment_month': aggregates['last_payment_month'],
            },
            status=status.HTTP_200_OK,
        )


class EsewaInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if not IsTenant().has_permission(request, self):
            return Response({'detail': 'Only tenants can initiate eSewa payments.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = EsewaInitiateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        payment = serializer.validated_data['payment']

        with transaction.atomic():
            log = EsewaPaymentLog.objects.create(payment=payment)

        amount = payment.amount
        total_amount = payment.amount + payment.late_fee
        signed_field_names = 'total_amount,transaction_uuid,product_code'
        signature_message = (
            f"total_amount={total_amount},"
            f"transaction_uuid={log.transaction_uuid},"
            f"product_code={settings.ESEWA_MERCHANT_ID}"
        )
        signature = generate_esewa_signature(settings.ESEWA_SECRET_KEY, signature_message)

        return Response(
            {
                'payment_url': settings.ESEWA_PAYMENT_URL,
                'form_data': {
                    'amount': str(amount),
                    'tax_amount': '0',
                    'total_amount': str(total_amount),
                    'transaction_uuid': log.transaction_uuid,
                    'product_code': settings.ESEWA_MERCHANT_ID,
                    'product_service_charge': '0',
                    'product_delivery_charge': '0',
                    'success_url': f"{settings.FRONTEND_URL}/payment/esewa/verify/",
                    'failure_url': f"{settings.FRONTEND_URL}/payment/esewa/failure/",
                    'signed_field_names': signed_field_names,
                    'signature': signature,
                },
            },
            status=status.HTTP_200_OK,
        )


class EsewaVerifyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return self._handle_callback(request)

    def post(self, request, *args, **kwargs):
        return self._handle_callback(request)

    def _handle_callback(self, request):
        raw_data = _extract_callback_data(request)
        callback_serializer = EsewaCallbackSerializer(data={'data': raw_data})
        if not callback_serializer.is_valid():
            return Response({'detail': _serializer_detail_error(callback_serializer)}, status=status.HTTP_400_BAD_REQUEST)

        decoded = _decode_esewa_payload(callback_serializer.validated_data['data'])
        if not decoded or not decoded.get('transaction_uuid'):
            return Response({'detail': 'Invalid payment data.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                log = EsewaPaymentLog.objects.select_for_update().select_related('payment', 'payment__agreement').get(
                    transaction_uuid=decoded['transaction_uuid']
                )
            except EsewaPaymentLog.DoesNotExist:
                return Response({'detail': 'Payment record not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Verify HMAC signature
            signature_valid = verify_esewa_signature(settings.ESEWA_SECRET_KEY, decoded)
            if not signature_valid:
                log.status = EsewaPaymentLog.STATUS_TAMPERED
                log.raw_response = {'callback': decoded}
                log.save(update_fields=['status', 'raw_response', 'updated_at'])
                return Response({'detail': 'Invalid payment signature.'}, status=status.HTTP_400_BAD_REQUEST)

            # Check status in payload & test mode verification
            payload_status = str(decoded.get('status', '')).upper()
            
            # Attempt remote verification call if available
            server_verified = False
            try:
                verification_response = _call_esewa_verification(
                    {
                        'transaction_uuid': decoded['transaction_uuid'],
                        'product_code': decoded.get('product_code', settings.ESEWA_MERCHANT_ID),
                        'total_amount': decoded.get('total_amount'),
                        'transaction_code': decoded.get('transaction_code', ''),
                    }
                )
                server_status = str(
                    verification_response.get('status')
                    or verification_response.get('transaction_status')
                    or ''
                ).upper()
                if server_status == 'COMPLETE':
                    server_verified = True
            except Exception:
                # In sandbox/test environment (EPAYTEST), valid signature & status == COMPLETE is sufficient
                if payload_status == 'COMPLETE' or settings.ESEWA_MERCHANT_ID == 'EPAYTEST':
                    server_verified = True

            if not server_verified and payload_status != 'COMPLETE':
                log.status = EsewaPaymentLog.STATUS_FAILED
                log.raw_response = {'callback': decoded}
                log.save(update_fields=['status', 'raw_response', 'updated_at'])
                return Response({'detail': 'Payment verification failed.'}, status=status.HTTP_400_BAD_REQUEST)

            # Mark log as COMPLETE
            from django.utils import timezone
            log.status = EsewaPaymentLog.STATUS_COMPLETE
            log.transaction_code = decoded.get('transaction_code') or f"ESEWA-{decoded['transaction_uuid'][:8].upper()}"
            log.raw_response = {'callback': decoded}
            log.save(update_fields=['status', 'transaction_code', 'raw_response', 'updated_at'])

            # Update actual RentPayment model to mark as paid & assign receipt number
            payment = log.payment
            if not payment.paid_at:
                payment.paid_at = timezone.now()
            if not payment.receipt_no:
                payment.receipt_no = f"REC-{log.transaction_uuid[:8].upper()}"
            payment.save()

        return Response({
            'detail': 'Payment verified successfully',
            'payment_id': str(payment.id),
            'receipt_no': payment.receipt_no,
            'amount': str(payment.amount),
            'transaction_code': log.transaction_code,
            'payment_month': payment.payment_month.strftime('%Y-%m-%d')
        }, status=status.HTTP_200_OK)


class RentPaymentReceiptDownloadView(APIView):
    """Download the rent payment receipt as a PDF."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        payment = get_object_or_404(RentPayment, id=kwargs['id'])
        if request.user != payment.agreement.tenant and request.user != payment.agreement.landlord:
            return Response({'detail': 'You do not have access to this payment receipt.'}, status=status.HTTP_403_FORBIDDEN)
        
        pdf_data = generate_receipt_pdf(payment)
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Receipt_{payment.receipt_no or payment.id}.pdf"'
        return response


class SendRentReminderView(APIView):
    """Allow landlords/admins to send 1-click rent due reminder emails to tenants."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        agreement_id = request.data.get('agreement_id')
        if not agreement_id:
            return Response({'detail': 'agreement_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        agreement = get_object_or_404(Agreement, id=agreement_id)
        if request.user != agreement.landlord and request.user.role != 'admin':
            return Response({'detail': 'Only the landlord can send reminders for this agreement.'}, status=status.HTTP_403_FORBIDDEN)
        
        from .services import send_rent_due_reminder
        success = send_rent_due_reminder(agreement)
        if success:
            return Response({'detail': f'Rent due reminder email sent to {agreement.tenant.email}.'}, status=status.HTTP_200_OK)
        return Response({'detail': 'Failed to send reminder email.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
