from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.http import HttpResponse
from .models import UtilityBill, UtilityMeterReading
from .serializers import UtilityBillSerializer, UtilityMeterReadingSerializer
from core.permissions import IsLandlord, IsTenant
from core.services.pdf_generator import generate_utility_bill_pdf

class IsLandlordOrTenantReadOnly(permissions.BasePermission):
    """
    Allows full access to Landlords, but only read-only access to Tenants.
    """
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            if request.user.role == 'landlord':
                return True
            if request.user.role == 'tenant' and request.method in permissions.SAFE_METHODS:
                return True
        return False

class UtilityBillViewSet(viewsets.ModelViewSet):
    serializer_class = UtilityBillSerializer
    permission_classes = [IsLandlordOrTenantReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'landlord':
            return UtilityBill.objects.filter(agreement__landlord=user)
        elif user.role == 'tenant':
            return UtilityBill.objects.filter(agreement__tenant=user)
        return UtilityBill.objects.none()

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Download Utility Bill as formatted PDF."""
        bill = self.get_object()
        pdf_bytes = generate_utility_bill_pdf(bill)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="utility_bill_{bill.id.hex[:8]}.pdf"'
        return response

class UtilityMeterReadingViewSet(viewsets.ModelViewSet):
    serializer_class = UtilityMeterReadingSerializer
    permission_classes = [IsLandlordOrTenantReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'landlord':
            return UtilityMeterReading.objects.filter(agreement__landlord=user)
        elif user.role == 'tenant':
            return UtilityMeterReading.objects.filter(agreement__tenant=user)
        return UtilityMeterReading.objects.none()
