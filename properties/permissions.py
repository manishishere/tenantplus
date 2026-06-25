from rest_framework.permissions import BasePermission

from accounts.permissions import IsAdminUser, IsLandlord, IsTenant


class IsPropertyOwner(BasePermission):
    """Allow access only if the user owns the property being edited."""

    def has_object_permission(self, request, view, obj):
        return obj.landlord == request.user
