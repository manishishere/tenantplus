from rest_framework.permissions import BasePermission


class IsUser(BasePermission):
    """Allow access only to users with role='user'."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'user'
        )


class IsModerator(BasePermission):
    """Allow access only to users with role='moderator' or 'admin'."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in {'moderator', 'admin'}
        )


class IsAdminUser(BasePermission):
    """Allow access only to users with role='admin'."""

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )
