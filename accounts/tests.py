from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

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
