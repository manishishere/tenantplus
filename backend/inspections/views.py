from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MoveOutInspection
from .pagination import InspectionPagination
from .serializers import (
    InspectionCreateSerializer,
    InspectionDetailSerializer,
    InspectionFinalizeSerializer,
    InspectionListSerializer,
    InspectionUpdateSerializer,
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


def _is_landlord_or_admin(user):
    return getattr(user, 'role', None) == 'landlord' or getattr(user, 'role', None) == 'admin'


class InspectionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role == 'tenant':
            queryset = MoveOutInspection.objects.filter(agreement__tenant=request.user)
        elif request.user.role == 'landlord':
            queryset = MoveOutInspection.objects.filter(agreement__landlord=request.user)
        else:
            queryset = MoveOutInspection.objects.none()

        paginator = InspectionPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = InspectionListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = InspectionListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if not _is_landlord_or_admin(request.user):
            return Response({'detail': 'Only landlords or admins can log inspection reports.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = InspectionCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            inspection = serializer.save(inspector=request.user)

        return Response(InspectionDetailSerializer(inspection).data, status=status.HTTP_201_CREATED)


class InspectionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        inspection = get_object_or_404(MoveOutInspection, id=kwargs['id'])
        if request.user != inspection.agreement.tenant and request.user != inspection.agreement.landlord:
            return Response({'detail': 'You do not have access to this inspection report.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(InspectionDetailSerializer(inspection).data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        inspection = get_object_or_404(MoveOutInspection, id=kwargs['id'])
        if not _is_landlord_or_admin(request.user):
            return Response({'detail': 'Only landlords or admins can update inspection reports.'}, status=status.HTTP_403_FORBIDDEN)
        if inspection.is_finalized:
            return Response({'detail': 'Finalized inspection logs cannot be altered.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = InspectionUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        if 'inspection_date' in validated_data:
            inspection.inspection_date = validated_data['inspection_date']
        if 'structural_condition' in validated_data:
            inspection.structural_condition = validated_data['structural_condition']
        if 'utility_status' in validated_data:
            inspection.utility_status = validated_data['utility_status']
        if 'total_deductions' in validated_data:
            inspection.total_deductions = validated_data['total_deductions']
        if 'deduction_reason' in validated_data:
            inspection.deduction_reason = validated_data['deduction_reason']
        if 'is_finalized' in validated_data:
            inspection.is_finalized = validated_data['is_finalized']

        inspection.save()
        return Response(InspectionDetailSerializer(inspection).data, status=status.HTTP_200_OK)
