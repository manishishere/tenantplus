from decimal import Decimal

from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Agreement
from .pagination import AgreementPagination
from .serializers import (
    AgreementAcknowledgeSerializer,
    AgreementDetailSerializer,
    AgreementListSerializer,
    AgreementTerminateSerializer,
)
from core.services.pdf_generator import generate_agreement_pdf


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


class AgreementListView(APIView):
    """List agreements visible to the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return agreements for the current tenant or landlord."""
        if request.user.role == 'tenant':
            queryset = Agreement.objects.filter(tenant=request.user)
        elif request.user.role == 'landlord':
            queryset = Agreement.objects.filter(landlord=request.user)
        else:
            queryset = Agreement.objects.none()

        paginator = AgreementPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = AgreementListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = AgreementListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AgreementDetailView(APIView):
    """Return the detail view for a single agreement."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return a single agreement if the user is related to it."""
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord:
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = AgreementDetailSerializer(agreement)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AgreementAcknowledgeView(APIView):
    """Allow a tenant or landlord to acknowledge or reject a signed agreement."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """Record acknowledgment or rejection from the current tenant or landlord."""
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord:
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action', 'approve')  # 'approve' or 'reject'
        reason = request.data.get('reason', '')

        if action == 'approve':
            if request.user == agreement.tenant:
                agreement.tenant_acknowledged = True
            elif request.user == agreement.landlord:
                agreement.landlord_acknowledged = True

            # If both parties have acknowledged, mark doc status as acknowledged & agreement active
            if agreement.tenant_acknowledged and agreement.landlord_acknowledged:
                agreement.signed_doc_status = 'acknowledged'
                agreement.status = Agreement.STATUS_ACTIVE

        elif action == 'reject':
            # Reset mutual acknowledgments on rejection, require re-upload
            agreement.tenant_acknowledged = False
            agreement.landlord_acknowledged = False
            agreement.signed_doc_status = 'rejected'
            agreement.rejection_reason = reason or f"Rejected by {request.user.full_name or request.user.email}."

        agreement.save()
        return Response(AgreementDetailSerializer(agreement).data, status=status.HTTP_200_OK)


class AgreementUploadSignedView(APIView):
    """Allow tenant or landlord to upload the signed agreement PDF."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord:
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)

        file_url = request.data.get('signed_document_url', '')
        if not file_url:
            file_url = f"/media/agreements/signed_{agreement.id.hex[:8]}.pdf"

        agreement.signed_document_url = file_url
        agreement.signed_doc_status = 'uploaded_pending_ack'
        agreement.rejection_reason = ''

        # Save distinct signature image URLs depending on who signed
        landlord_sig = request.data.get('landlord_signature_url')
        tenant_sig = request.data.get('tenant_signature_url')

        if landlord_sig:
            agreement.landlord_signature_url = landlord_sig
            agreement.landlord_acknowledged = True
        if tenant_sig:
            agreement.tenant_signature_url = tenant_sig
            agreement.tenant_acknowledged = True

        if request.user == agreement.tenant:
            agreement.tenant_acknowledged = True
            if file_url:
                agreement.tenant_signature_url = file_url
        elif request.user == agreement.landlord:
            if landlord_sig or file_url:
                agreement.landlord_acknowledged = True
                agreement.landlord_signature_url = landlord_sig or file_url

        # Update Witness 1 & Witness 2 legal details if provided in request
        if 'witness1_name' in request.data:
            agreement.witness1_name = request.data.get('witness1_name')
        if 'witness1_citizenship' in request.data:
            agreement.witness1_citizenship = request.data.get('witness1_citizenship')
        if 'witness1_phone' in request.data:
            agreement.witness1_phone = request.data.get('witness1_phone')

        if 'witness2_name' in request.data:
            agreement.witness2_name = request.data.get('witness2_name')
        if 'witness2_citizenship' in request.data:
            agreement.witness2_citizenship = request.data.get('witness2_citizenship')
        if 'witness2_phone' in request.data:
            agreement.witness2_phone = request.data.get('witness2_phone')

        if agreement.tenant_acknowledged and agreement.landlord_acknowledged:
            agreement.signed_doc_status = 'acknowledged'
            if agreement.status != Agreement.STATUS_PENDING_ADVANCE:
                agreement.status = Agreement.STATUS_ACTIVE

        agreement.save()
        return Response(AgreementDetailSerializer(agreement).data, status=status.HTTP_200_OK)


class AgreementTerminateView(APIView):
    """Allow either party to terminate an active agreement."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """Terminate an active agreement and make the property available again."""
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord:
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)
        if agreement.status != Agreement.STATUS_ACTIVE:
            return Response({'detail': 'This agreement is not active.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AgreementTerminateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            agreement.status = Agreement.STATUS_TERMINATED
            agreement.save()
            agreement.property.is_available = True
            agreement.property.save()

        return Response(AgreementDetailSerializer(agreement).data, status=status.HTTP_200_OK)


class AgreementPDFDownloadView(APIView):
    """Download the tenancy agreement as a PDF with clean, descriptive filename."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord and request.user.role != 'admin':
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)
        
        pdf_bytes = generate_agreement_pdf(agreement)
        tenant_name = (agreement.tenant.full_name or agreement.tenant.email).replace(' ', '_')
        prop_title = agreement.property.title.replace(' ', '_')
        filename = f"House_Rent_Agreement_{tenant_name}_{prop_title}.pdf"
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AgreementPayAdvanceView(APIView):
    """Allow tenant to pay the advance rent via eSewa within the 24-hour window to activate the agreement."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        from django.conf import settings
        from django.utils import timezone
        from rent_payments.models import EsewaPaymentLog, RentPayment
        from rent_payments.esewa import generate_esewa_signature

        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant:
            return Response({'detail': 'Only the tenant can pay the advance.'}, status=status.HTTP_403_FORBIDDEN)

        if agreement.status != Agreement.STATUS_PENDING_ADVANCE:
            return Response({'detail': 'This agreement does not require advance payment.'}, status=status.HTTP_400_BAD_REQUEST)

        if agreement.advance_payment_status == Agreement.ADVANCE_STATUS_PAID:
            return Response({'detail': 'Advance payment has already been completed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if the 24-hour window has expired
        if agreement.advance_payment_deadline and timezone.now() > agreement.advance_payment_deadline:
            # Auto-cancel: free the property and mark application as rejected
            with transaction.atomic():
                agreement.advance_payment_status = Agreement.ADVANCE_STATUS_EXPIRED
                agreement.status = Agreement.STATUS_TERMINATED
                agreement.save()

                prop = agreement.property
                prop.is_available = True
                prop.save()

                application = agreement.application
                application.status = 'rejected'
                application.save()

            return Response(
                {'detail': 'The 24-hour advance payment window has expired. The application has been auto-cancelled and the property is now available again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or reuse an unpaid RentPayment record for the advance
        with transaction.atomic():
            payment_month = agreement.start_date.replace(day=1)
            payment, _created = RentPayment.objects.get_or_create(
                agreement=agreement,
                payment_month=payment_month,
                defaults={
                    'amount': agreement.advance_amount or agreement.rent_amount,
                    'notes': 'Advance payment — agreement activation (via eSewa)',
                    'late_fee': 0,
                    'is_late': False,
                },
            )
            # If already paid via eSewa, just activate
            if payment.paid_at and payment.esewa_verified:
                agreement.advance_payment_status = Agreement.ADVANCE_STATUS_PAID
                agreement.status = Agreement.STATUS_ACTIVE
                agreement.save()
                return Response(AgreementDetailSerializer(agreement).data, status=status.HTTP_200_OK)

            # Create eSewa payment log and generate signed form data
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
                'payment_id': str(payment.id),
                'agreement_id': str(agreement.id),
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


class AgreementProposeRenewalView(APIView):
    """Propose a 1-year agreement renewal with optional 1-10% rent escalation slider."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord:
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            increase_percent = Decimal(str(request.data.get('increase_percent', 0)))
        except Exception:
            increase_percent = Decimal('0.00')

        if increase_percent < 0 or increase_percent > 10:
            return Response({'detail': 'Rent escalation percentage must be between 0% and 10%.'}, status=status.HTTP_400_BAD_REQUEST)

        proposed_rent = agreement.rent_amount * (Decimal('1.00') + (increase_percent / Decimal('100.00')))

        agreement.renewal_status = 'proposed'
        agreement.renewal_proposed_by = request.user
        agreement.renewal_proposed_rent = proposed_rent
        agreement.renewal_increase_percent = increase_percent
        agreement.save()

        return Response(AgreementDetailSerializer(agreement).data, status=status.HTTP_200_OK)


class AgreementRespondRenewalView(APIView):
    """Accept or reject a proposed agreement renewal."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord:
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        if agreement.renewal_status != 'proposed':
            return Response({'detail': 'No pending renewal proposal for this agreement.'}, status=status.HTTP_400_BAD_REQUEST)

        if agreement.renewal_proposed_by == request.user:
            return Response({'detail': 'You cannot accept/reject your own renewal proposal.'}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        if action == 'accept':
            from dateutil.relativedelta import relativedelta
            agreement.renewal_status = 'accepted'
            agreement.end_date = agreement.end_date + relativedelta(years=1)
            if agreement.renewal_proposed_rent:
                agreement.rent_amount = agreement.renewal_proposed_rent
            agreement.save()
        elif action == 'reject':
            agreement.renewal_status = 'rejected'
            agreement.save()
        else:
            return Response({'detail': 'Invalid action. Choose accept or reject.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(AgreementDetailSerializer(agreement).data, status=status.HTTP_200_OK)


class AgreementAdminListView(APIView):
    """Return all agreements for administrative oversight."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from core.permissions import IsAdminUser
        if not IsAdminUser().has_permission(request, self):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        agreements = Agreement.objects.all().order_by('-created_at')
        serializer = AgreementListSerializer(agreements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
