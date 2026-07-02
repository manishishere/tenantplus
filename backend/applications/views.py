from datetime import date

from dateutil.relativedelta import relativedelta
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsLandlord, IsTenant

from .models import Application
from .pagination import ApplicationPagination
from .permissions import IsApplicationPropertyOwner, IsApplicationTenant
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationDetailSerializer,
    ApplicationListSerializer,
    ApplicationStatusUpdateSerializer,
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


class ApplicationListCreateView(APIView):
    """List applications for the current user or create a new one."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return applications visible to the authenticated user."""
        if request.user.role == 'tenant':
            queryset = Application.objects.filter(tenant=request.user)
        elif request.user.role == 'landlord':
            queryset = Application.objects.filter(property__landlord=request.user)
        else:
            queryset = Application.objects.none()

        paginator = ApplicationPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = ApplicationListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = ApplicationListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """Create a new application for the authenticated tenant."""
        if not IsTenant().has_permission(request, self):
            return Response({'detail': 'Only tenants can submit applications.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ApplicationCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)
        application = serializer.save(tenant=request.user)
        return Response(ApplicationDetailSerializer(application).data, status=status.HTTP_201_CREATED)


class ApplicationDetailView(APIView):
    """Return the detail view for a single application."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return a single application if the user is related to it."""
        application = get_object_or_404(Application, id=kwargs['id'])
        if request.user != application.tenant and request.user != application.property.landlord:
            return Response({'detail': 'You do not have access to this application.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ApplicationDetailSerializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApplicationStatusUpdateView(APIView):
    """Allow a landlord to accept or reject an application."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """Update an application's status and create an agreement on acceptance."""
        if not IsLandlord().has_permission(request, self):
            return Response({'detail': 'Only landlords can update applications.'}, status=status.HTTP_403_FORBIDDEN)

        application = get_object_or_404(Application, id=kwargs['id'])
        if not IsApplicationPropertyOwner().has_object_permission(request, self, application):
            return Response({'detail': 'You do not own the property for this application.'}, status=status.HTTP_403_FORBIDDEN)
        if application.status != Application.STATUS_PENDING:
            return Response({'detail': 'This application has already been processed.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ApplicationStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data['status']
        with transaction.atomic():
            application.status = new_status
            application.save()

            if new_status == Application.STATUS_ACCEPTED:
                application.property.is_available = False
                application.property.save()
                from agreements.models import Agreement

                Agreement.objects.create(
                    tenant=application.tenant,
                    landlord=application.property.landlord,
                    property=application.property,
                    application=application,
                    rent_amount=application.property.rent_amount,
                    status='active',
                    start_date=date.today(),
                    end_date=date.today() + relativedelta(years=1),
                )

        return Response(ApplicationDetailSerializer(application).data, status=status.HTTP_200_OK)


class ApplicationWithdrawView(APIView):
    """Allow a tenant to withdraw a pending application."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        """Withdraw a pending application submitted by the authenticated tenant."""
        application = get_object_or_404(Application, id=kwargs['id'])
        if not IsApplicationTenant().has_object_permission(request, self, application):
            return Response({'detail': 'You do not have permission to withdraw this application.'}, status=status.HTTP_403_FORBIDDEN)
        if application.status != Application.STATUS_PENDING:
            return Response({'detail': 'Only pending applications can be withdrawn.'}, status=status.HTTP_400_BAD_REQUEST)
        application.status = Application.STATUS_WITHDRAWN
        application.save()
        return Response(ApplicationDetailSerializer(application).data, status=status.HTTP_200_OK)
