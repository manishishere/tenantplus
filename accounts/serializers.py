from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .models import PasswordResetToken, UserDocument

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Validate and create a new user account for public registration."""

    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('full_name', 'email', 'phone', 'password', 'password2', 'role')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise ValidationError({'password2': 'Passwords do not match.'})
        return attrs

    def validate_role(self, value):
        if value == 'admin':
            raise ValidationError('You cannot register as admin.')
        return value

    def create(self, validated_data):
        validated_data.pop('password2', None)
        password = validated_data.pop('password')
        return User.objects.create_user(password=password, **validated_data)


class LoginSerializer(serializers.Serializer):
    """Validate login payloads for the authentication endpoint."""

    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    """Expose safe read-only profile information to authenticated users."""

    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'phone', 'role', 'is_verified', 'created_at')
        read_only_fields = fields


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Allow authenticated users to update their profile details."""

    class Meta:
        model = User
        fields = ('full_name', 'phone')


class ChangePasswordSerializer(serializers.Serializer):
    """Validate password change requests for logged-in users."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise ValidationError({'new_password2': 'New passwords do not match.'})
        return attrs


class UserDocumentSerializer(serializers.ModelSerializer):
    """Validate document submissions for tenancy verification."""

    class Meta:
        model = UserDocument
        fields = ('id', 'user', 'doc_type', 'doc_url', 'status', 'verified_at', 'created_at')
        read_only_fields = ('user', 'status', 'verified_at', 'created_at')


class PasswordResetRequestSerializer(serializers.Serializer):
    """Validate the email supplied for password reset requests."""

    email = serializers.EmailField()

    def validate_email(self, value):
        User.objects.filter(email=value).exists()
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Validate password reset confirmation payloads."""

    token = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise ValidationError({'new_password2': 'New passwords do not match.'})
        return attrs
