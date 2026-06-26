from datetime import timedelta
import smtplib
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.test import RequestFactory, TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from .middleware import RoleAuthorizationMiddleware, authorizeRoles
from .models import EmailVerificationOTP, PasswordResetToken
from .views import PasswordResetRequestView, RegisterView, ResendOTPView, VerifyEmailView


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

    def test_create_user_defaults_to_tenant_role(self):
        """A newly created user should inherit the default tenant role."""
        user = get_user_model().objects.create_user(
            email='new-user@example.com',
            password='secret123',
            full_name='New User',
        )
        self.assertEqual(user.role, 'tenant')


class RegisterSerializerTests(TestCase):
    """Validate public registration role handling."""

    def test_register_serializer_accepts_tenant_and_landlord_roles(self):
        """Registration should accept tenant and landlord roles."""
        from .serializers import RegisterSerializer

        tenant_serializer = RegisterSerializer(data={
            'full_name': 'Tenant User',
            'email': 'tenant2@example.com',
            'phone': '1234567890',
            'password': 'secret123',
            'password2': 'secret123',
            'role': 'tenant',
        })
        landlord_serializer = RegisterSerializer(data={
            'full_name': 'Landlord User',
            'email': 'landlord2@example.com',
            'phone': '1234567890',
            'password': 'secret123',
            'password2': 'secret123',
            'role': 'landlord',
        })

        self.assertTrue(tenant_serializer.is_valid(), tenant_serializer.errors)
        self.assertTrue(landlord_serializer.is_valid(), landlord_serializer.errors)

    def test_register_serializer_normalizes_tentant_typo(self):
        """Registration should treat the common tentant typo as tenant."""
        from .serializers import RegisterSerializer

        serializer = RegisterSerializer(data={
            'full_name': 'Tenant Typo',
            'email': 'tenant-typo@example.com',
            'phone': '1234567890',
            'password': 'secret123',
            'password2': 'secret123',
            'role': 'tentant',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['role'], 'tenant')

    def test_register_serializer_rejects_admin_role(self):
        """Registration should not allow admin signup."""
        from .serializers import RegisterSerializer

        serializer = RegisterSerializer(data={
            'full_name': 'Admin User',
            'email': 'admin2@example.com',
            'phone': '1234567890',
            'password': 'secret123',
            'password2': 'secret123',
            'role': 'admin',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)


class EmailVerificationOTPTests(TestCase):
    """Validate the email verification OTP model and views."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = get_user_model().objects.create_user(
            email='verify@example.com',
            password='secret123',
            full_name='Verify User',
            role='tenant',
        )

    def test_email_verification_otp_expiration(self):
        """OTP should expire after ten minutes."""
        otp = EmailVerificationOTP.objects.create(user=self.user, otp='123456')
        otp.created_at = timezone.now() - timedelta(minutes=11)
        otp.save(update_fields=['created_at'])
        self.assertTrue(otp.is_expired())

    @patch('accounts.views.send_mail')
    def test_register_view_creates_email_verification_otp(self, mocked_send_mail):
        """Registration should create and send an email verification OTP."""
        request = self.factory.post(
            '/api/accounts/register/',
            {
                'full_name': 'New Tenant',
                'email': 'new-tenant@example.com',
                'phone': '1234567890',
                'password': 'secret123',
                'password2': 'secret123',
                'role': 'tenant',
            },
            format='json',
        )

        response = RegisterView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        created_user = get_user_model().objects.get(email='new-tenant@example.com')
        otp = EmailVerificationOTP.objects.filter(user=created_user).latest('created_at')
        self.assertEqual(len(otp.otp), 6)
        self.assertTrue(otp.otp.isdigit())
        mocked_send_mail.assert_called_once()

    def test_verify_email_view_marks_user_verified(self):
        """Valid OTP should mark the email and OTP as verified/used."""
        otp_record = EmailVerificationOTP.objects.create(user=self.user, otp='123456')
        request = self.factory.post('/api/accounts/verify-email/', {'otp': '123456'}, format='json')
        force_authenticate(request, user=self.user)

        response = VerifyEmailView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        otp_record.refresh_from_db()
        self.assertTrue(self.user.is_verified)
        self.assertTrue(otp_record.is_used)

    def test_resend_otp_invalidates_previous_unused_otps(self):
        """Resending should invalidate old unused OTPs and create a new one."""
        EmailVerificationOTP.objects.create(user=self.user, otp='111111')
        old_otp = EmailVerificationOTP.objects.create(user=self.user, otp='222222')
        request = self.factory.post('/api/accounts/resend-otp/', {})
        force_authenticate(request, user=self.user)

        response = ResendOTPView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        old_otp.refresh_from_db()
        self.assertTrue(old_otp.is_used)
        self.assertEqual(EmailVerificationOTP.objects.filter(user=self.user).count(), 3)

    def test_resend_otp_rejects_verified_users(self):
        """Verified users should not receive a new OTP."""
        self.user.is_verified = True
        self.user.save(update_fields=['is_verified'])
        request = self.factory.post('/api/accounts/resend-otp/', {})
        force_authenticate(request, user=self.user)

        response = ResendOTPView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'Email is already verified.')


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


class PasswordResetRequestViewTests(TestCase):
    """Validate password reset email delivery failure handling."""

    def setUp(self):
        self.factory = RequestFactory()
        self.user = get_user_model().objects.create_user(
            email='reset@example.com',
            password='secret123',
            full_name='Reset User',
            role='tenant',
        )

    @patch('accounts.views.send_mail', side_effect=smtplib.SMTPAuthenticationError(534, b'auth required'))
    def test_password_reset_request_returns_bad_gateway_on_smtp_auth_failure(self, mocked_send_mail):
        """SMTP auth failures should return a friendly 502 instead of a 500."""
        request = self.factory.post('/api/accounts/password-reset/request/', {'email': self.user.email}, format='json')

        response = PasswordResetRequestView.as_view()(request)

        self.assertEqual(response.status_code, 502)
        self.assertIn('Gmail rejected the SMTP login', response.data['detail'])
        self.assertFalse(PasswordResetToken.objects.filter(user=self.user).exists())
        mocked_send_mail.assert_called_once()
