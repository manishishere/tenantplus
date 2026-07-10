from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUser, IsLandlord, IsTenant

from .models import Dispute
from .pagination import DisputePagination
from .serializers import DisputeCreateSerializer, DisputeResolveSerializer, DisputeSerializer


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


class DisputeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role == 'tenant':
            queryset = Dispute.objects.filter(agreement__tenant=request.user)
        elif request.user.role == 'landlord':
            queryset = Dispute.objects.filter(agreement__landlord=request.user)
        elif request.user.role == 'admin':
            queryset = Dispute.objects.all()
        else:
            queryset = Dispute.objects.none()

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        paginator = DisputePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = DisputeSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = DisputeSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if not (IsTenant().has_permission(request, self) or IsLandlord().has_permission(request, self)):
            return Response({'detail': 'Only tenants and landlords can file disputes.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DisputeCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        dispute = serializer.save(filed_by=request.user)
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


class DisputeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        dispute = get_object_or_404(Dispute, id=kwargs['id'])
        if request.user.role != 'admin' and request.user != dispute.agreement.tenant and request.user != dispute.agreement.landlord:
            return Response({'detail': 'You do not have access to this dispute.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = DisputeSerializer(dispute)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DisputeResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        if not IsAdminUser().has_permission(request, self):
            return Response({'detail': 'Only admins can resolve disputes.'}, status=status.HTTP_403_FORBIDDEN)

        dispute = get_object_or_404(Dispute, id=kwargs['id'])
        serializer = DisputeResolveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        dispute.status = validated_data['status']
        if 'admin_notes' in validated_data:
            dispute.admin_notes = validated_data['admin_notes']
        dispute.resolved_at = timezone.now()
        dispute.save()
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_200_OK)