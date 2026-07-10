from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notice
from .pagination import NoticePagination
from .serializers import (
    NoticeAcknowledgeSerializer,
    NoticeCreateSerializer,
    NoticeDetailSerializer,
    NoticeListSerializer,
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


class NoticeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role == 'tenant':
            queryset = Notice.objects.filter(agreement__tenant=request.user)
        elif request.user.role == 'landlord':
            queryset = Notice.objects.filter(agreement__landlord=request.user)
        elif request.user.role == 'admin':
            queryset = Notice.objects.all()
        else:
            queryset = Notice.objects.none()

        agreement_id = request.query_params.get('agreement_id')
        notice_type = request.query_params.get('notice_type')
        if agreement_id:
            queryset = queryset.filter(agreement__id=agreement_id)
        if notice_type:
            queryset = queryset.filter(notice_type=notice_type)

        paginator = NoticePagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = NoticeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = NoticeListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if request.user.role not in ('tenant', 'landlord'):
            return Response({'detail': 'Only tenants and landlords can issue notices.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = NoticeCreateSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response({'detail': _serializer_detail_error(serializer)}, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        notice = serializer.save(
            issued_by=request.user,
            effective_date=timezone.localdate() + timedelta(days=validated_data['notice_period_days']),
        )
        return Response(NoticeDetailSerializer(notice).data, status=status.HTTP_201_CREATED)


class NoticeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        notice = get_object_or_404(Notice, id=kwargs['id'])
        if request.user != notice.agreement.tenant and request.user != notice.agreement.landlord and request.user.role != 'admin':
            return Response({'detail': 'You do not have access to this notice.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = NoticeDetailSerializer(notice)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NoticeAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        notice = get_object_or_404(Notice, id=kwargs['id'])
        serializer = NoticeAcknowledgeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if request.user != notice.agreement.tenant and request.user != notice.agreement.landlord:
            return Response({'detail': 'You do not have access to this notice.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user == notice.issued_by:
            return Response({'detail': 'You cannot acknowledge your own notice.'}, status=status.HTTP_400_BAD_REQUEST)
        if notice.is_acknowledged:
            return Response({'detail': 'This notice has already been acknowledged.'}, status=status.HTTP_400_BAD_REQUEST)

        notice.is_acknowledged = True
        notice.acknowledged_at = timezone.now()
        notice.save()
        return Response(NoticeDetailSerializer(notice).data, status=status.HTTP_200_OK)

