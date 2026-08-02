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
        if request.user == agreement.tenant:
            agreement.tenant_acknowledged = True
            if file_url:
                agreement.tenant_signature_url = file_url
        elif request.user == agreement.landlord:
            agreement.landlord_acknowledged = True
            if file_url:
                agreement.landlord_signature_url = file_url
        else:
            agreement.landlord_acknowledged = True

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
    """Download the tenancy agreement as a PDF."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        if request.user != agreement.tenant and request.user != agreement.landlord:
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)
        
        pdf_bytes = generate_agreement_pdf(agreement)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="agreement.pdf"'
        return response

