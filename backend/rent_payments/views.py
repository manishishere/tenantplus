import base64
import json
from datetime import date
from decimal import Decimal
from uuid import UUID
import uuid as uuid_module

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Max, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTenant
from agreements.models import Agreement

from .esewa import generate_esewa_signature, verify_esewa_signature
from .models import EsewaPaymentLog
from .models import RentPayment
from .pagination import RentPaymentPagination
from .serializers import (
    EsewaInitiateSerializer,
    EsewaPaymentLogSerializer,
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

        validated_data = serializer.validated_data
        payment_month = validated_data['payment_month']
        amount = validated_data['amount']
        due_date = payment_month.replace(day=7)
        if date.today() > due_date:
            late_fee = Decimal('500.00')
        else:
            late_fee = Decimal('0.00')
        total_amount = amount + late_fee

        transaction_uuid = str(uuid_module.uuid4())
        signature = generate_esewa_signature(
            str(total_amount),
            transaction_uuid,
            settings.ESEWA_MERCHANT_ID,
        )

        log = EsewaPaymentLog.objects.create(
            agreement=validated_data['agreement'],
            payment_month=payment_month,
            amount=amount,
            transaction_uuid=transaction_uuid,
            status=EsewaPaymentLog.STATUS_PENDING,
        )

        return Response(
            {
                'payment_url': settings.ESEWA_PAYMENT_URL,
                'form_data': {
                    'amount': str(amount),
                    'tax_amount': '0',
                    'total_amount': str(total_amount),
                    'transaction_uuid': transaction_uuid,
                    'product_code': settings.ESEWA_MERCHANT_ID,
                    'product_service_charge': '0',
                    'product_delivery_charge': '0',
                    'success_url': f"{settings.FRONTEND_URL}/payment/esewa/verify/",
                    'failure_url': f"{settings.FRONTEND_URL}/payment/esewa/failure/",
                    'signed_field_names': 'total_amount,transaction_uuid,product_code',
                    'signature': signature,
                },
                'log_id': str(log.id),
            },
            status=status.HTTP_200_OK,
        )


class EsewaVerifyView(APIView):
    permission_classes = []

    def get(self, request, *args, **kwargs):
        raw = request.GET.get('data', '')
        try:
            decoded = json.loads(base64.b64decode(raw).decode())
        except Exception:
            return Response({'detail': 'Invalid payment data.'}, status=status.HTTP_400_BAD_REQUEST)

        valid = verify_esewa_signature(
            {
                'total_amount': decoded.get('total_amount'),
                'transaction_uuid': decoded.get('transaction_uuid'),
                'product_code': decoded.get('product_code'),
            },
            decoded.get('signature', ''),
        )
        if not valid:
            return Response({'detail': 'Invalid payment signature.'}, status=status.HTTP_400_BAD_REQUEST)

        if decoded.get('status') != 'COMPLETE':
            return Response({'detail': 'Payment was not completed.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            log = EsewaPaymentLog.objects.get(transaction_uuid=decoded['transaction_uuid'])
        except EsewaPaymentLog.DoesNotExist:
            return Response({'detail': 'Payment record not found.'}, status=status.HTTP_404_NOT_FOUND)

        if log.status == EsewaPaymentLog.STATUS_COMPLETED:
            return Response({'detail': 'Payment already processed.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            log.status = EsewaPaymentLog.STATUS_COMPLETED
            log.esewa_ref_id = decoded.get('transaction_code', '')
            log.save()
            payment = RentPayment(
                agreement=log.agreement,
                amount=log.amount,
                payment_month=log.payment_month,
                notes=(
                    f"eSewa payment. "
                    f"Ref: {decoded.get('transaction_code', '')}"
                ),
            )
            payment.save()
            log.rent_payment = payment
            log.save()

        return Response(RentPaymentDetailSerializer(payment).data, status=status.HTTP_201_CREATED)
