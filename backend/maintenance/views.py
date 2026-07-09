from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTenant

from .models import MaintenanceImage, MaintenanceRequest
from .pagination import MaintenancePagination
from .serializers import (
    MaintenanceRequestCreateSerializer,
    MaintenanceRequestDetailSerializer,
    MaintenanceRequestListSerializer,
    MaintenanceRequestUpdateSerializer,
    MaintenanceStatusUpdateSerializer,
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


class MaintenanceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role == 'tenant':
            queryset = MaintenanceRequest.objects.filter(tenant=request.user)
        elif request.user.role == 'landlord':
            queryset = MaintenanceRequest.objects.filter(property__landlord=request.user)
        else:
            queryset = MaintenanceRequest.objects.none()

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        paginator = MaintenancePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = MaintenanceRequestListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = MaintenanceRequestListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if not IsTenant().has_permission(request, self):
            return Response({'detail': 'Only tenants can log maintenance requests.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = MaintenanceRequestCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_files = request.FILES.getlist('images') + request.FILES.getlist('images[]')
        with transaction.atomic():
            maintenance_request = serializer.save(tenant=request.user)
            for uploaded_file in uploaded_files:
                MaintenanceImage.objects.create(request=maintenance_request, image=uploaded_file)

        return Response(MaintenanceRequestDetailSerializer(maintenance_request).data, status=status.HTTP_201_CREATED)


class MaintenanceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        maintenance_request = get_object_or_404(MaintenanceRequest, id=kwargs['id'])
        if request.user != maintenance_request.tenant and request.user != maintenance_request.property.landlord:
            return Response({'detail': 'You do not have permission to view this maintenance ticket.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = MaintenanceRequestDetailSerializer(maintenance_request)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        maintenance_request = get_object_or_404(MaintenanceRequest, id=kwargs['id'])
        if request.user != maintenance_request.tenant and request.user != maintenance_request.property.landlord:
            return Response({'detail': 'You do not have permission to view this maintenance ticket.'}, status=status.HTTP_403_FORBIDDEN)

        if request.user == maintenance_request.property.landlord:
            serializer = MaintenanceStatusUpdateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)
            validated_data = serializer.validated_data
            if 'status' in validated_data:
                maintenance_request.status = validated_data['status']
            if 'priority' in validated_data:
                maintenance_request.priority = validated_data['priority']
            maintenance_request.save()
            return Response(MaintenanceRequestDetailSerializer(maintenance_request).data, status=status.HTTP_200_OK)

        if maintenance_request.status != MaintenanceRequest.STATUS_PENDING:
            return Response({'detail': 'Cannot modify a request that is already under review or resolved.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = MaintenanceRequestUpdateSerializer(instance=maintenance_request, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        if 'title' in validated_data:
            maintenance_request.title = validated_data['title']
        if 'description' in validated_data:
            maintenance_request.description = validated_data['description']
        if 'priority' in validated_data:
            maintenance_request.priority = validated_data['priority']
        maintenance_request.save()
        return Response(MaintenanceRequestDetailSerializer(maintenance_request).data, status=status.HTTP_200_OK)
