from datetime import timedelta

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import RequestFactory, TestCase
from django.utils import timezone

from .middleware import RoleAuthorizationMiddleware, authorizeRoles
from .models import PasswordResetToken


class AccountsModelTests(TestCase):
    """Validate the custom user and password reset token model behavior."""

    def test_create_user_hashes_password(self):
        """A created user should store a hashed password and not the raw password."""
        user = get_user_model().objects.create_user(
            email='tenant@example.com',
            password='secret123',
            full_name='Test Tenant',
            role='tenant',
        )
        self.assertTrue(user.check_password('secret123'))
        self.assertNotEqual(user.password, 'secret123')

    def test_password_reset_token_expiration(self):
        """A token should be marked expired once its lifetime has passed."""
        user = get_user_model().objects.create_user(
            email='landlord@example.com',
            password='secret123',
            full_name='Test Landlord',
            role='landlord',
        )
        token = PasswordResetToken.objects.create(user=user, token='reset-token-123')
        token.created_at = timezone.now() - timedelta(minutes=31)
        token.save(update_fields=['created_at'])
        self.assertTrue(token.is_expired())

    def test_create_user_defaults_to_user_role(self):
        """A newly created user should inherit the default user role."""
        user = get_user_model().objects.create_user(
            email='new-user@example.com',
            password='secret123',
            full_name='New User',
        )
        self.assertEqual(user.role, 'user')


class RoleAuthorizationMiddlewareTests(TestCase):
    """Validate role-based access enforcement for protected views."""

    def setUp(self):
        self.factory = RequestFactory()
        self.user = get_user_model().objects.create_user(
            email='moderator@example.com',
            password='secret123',
            full_name='Moderator User',
            role='moderator',
        )
        self.admin = get_user_model().objects.create_user(
            email='admin@example.com',
            password='secret123',
            full_name='Admin User',
            role='admin',
        )

    def test_middleware_denies_non_authorized_roles(self):
        """A user without the required role should receive a 403 response."""
        decorated_view = authorizeRoles('admin')(lambda request: HttpResponse('ok'))
        middleware = RoleAuthorizationMiddleware(lambda request: HttpResponse('next'))
        request = self.factory.get('/test/')
        request.user = self.user

        response = middleware.process_view(request, decorated_view, (), {})

        self.assertEqual(response.status_code, 403)

    def test_middleware_allows_authorized_roles(self):
        """A user with the required role should be allowed through."""
        decorated_view = authorizeRoles('admin')(lambda request: HttpResponse('ok'))
        middleware = RoleAuthorizationMiddleware(lambda request: HttpResponse('next'))
        request = self.factory.get('/test/')
        request.user = self.admin

        response = middleware.process_view(request, decorated_view, (), {})

        self.assertIsNone(response)
