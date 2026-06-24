from rest_framework.permissions import BasePermission


class IsLandlord(BasePermission):
    """Allow access only to users with role='landlord'."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'landlord'
        )


class IsTenant(BasePermission):
    """Allow access only to users with role='tenant'."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'tenant'
        )


class IsAdminUser(BasePermission):
    """Allow access only to users with role='admin'."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )
