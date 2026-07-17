from rest_framework import viewsets, permissions
from .models import UtilityBill, UtilityMeterReading
from .serializers import UtilityBillSerializer, UtilityMeterReadingSerializer
from core.permissions import IsLandlord, IsTenant

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
