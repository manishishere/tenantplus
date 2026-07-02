from django.http import JsonResponse
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication


class RoleAuthorizationMiddleware:
    """Enforce role-based access for views decorated with authorizeRoles."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        required_roles = self._get_required_roles(view_func)
        if not required_roles:
            return None

        if not getattr(request, 'user', None) or not getattr(request.user, 'is_authenticated', False):
            try:
                user_auth_tuple = JWTAuthentication().authenticate(request)
                if user_auth_tuple is not None:
                    request.user, _ = user_auth_tuple
            except Exception:
                request.user = None

        if not getattr(request, 'user', None) or not getattr(request.user, 'is_authenticated', False):
            return JsonResponse(
                {'detail': 'Authentication credentials were not provided.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_role = getattr(request.user, 'role', 'user') or 'user'
        if user_role not in required_roles:
            return JsonResponse(
                {'detail': 'You do not have permission to perform this action.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return None

    def _get_required_roles(self, view_func):
        if hasattr(view_func, 'required_roles'):
            return getattr(view_func, 'required_roles')

        view_class = getattr(view_func, 'view_class', None)
        if view_class and hasattr(view_class, 'required_roles'):
            return getattr(view_class, 'required_roles')

        return None


def authorizeRoles(*roles):
    """Decorator that marks a view as requiring one of the supplied roles."""

    def decorator(view_func):
        setattr(view_func, 'required_roles', roles)
        return view_func

    return decorator
