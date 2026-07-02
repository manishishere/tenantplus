from django.db import transaction
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
    """Allow a tenant or landlord to acknowledge an agreement."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """Record acknowledgment from the current tenant or landlord."""
        agreement = get_object_or_404(Agreement, id=kwargs['id'])
        serializer = AgreementAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if request.user == agreement.tenant:
            agreement.tenant_acknowledged = True
        elif request.user == agreement.landlord:
            agreement.landlord_acknowledged = True
        else:
            return Response({'detail': 'You do not have access to this agreement.'}, status=status.HTTP_403_FORBIDDEN)

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

