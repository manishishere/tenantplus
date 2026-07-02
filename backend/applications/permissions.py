from rest_framework.permissions import BasePermission


class IsApplicationTenant(BasePermission):
    """Allow access only to the tenant who submitted the application."""

    def has_object_permission(self, request, view, obj):
        return obj.tenant == request.user


class IsApplicationPropertyOwner(BasePermission):
    """Allow access only to the landlord who owns the property."""

    def has_object_permission(self, request, view, obj):
        return obj.property.landlord == request.user