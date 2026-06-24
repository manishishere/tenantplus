import secrets

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetToken, UserDocument
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserDocumentSerializer,
    UserProfileSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    """Allow any visitor to register a new tenant or landlord account."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Create a new user and return JWT tokens for immediate login."""
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Authenticate a user and issue JWT access and refresh tokens."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Validate user credentials and return a token pair."""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, email=email, password=password)
        if user is None:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({'detail': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
                'user': UserProfileSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """Allow a logged-in user to blacklist their refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Blacklist a refresh token so the session cannot be reused."""
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({'detail': 'Token is invalid or already blacklisted.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_205_RESET_CONTENT)


class ProfileView(APIView):
    """Allow an authenticated user to read and update their profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return the authenticated user's public profile data."""
        return Response(UserProfileSerializer(request.user).data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        """Update the authenticated user's editable profile fields."""
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user).data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Allow an authenticated user to change their password securely."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Validate the old password and save the new one with hashing."""
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response({'detail': 'Old password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """Send a password reset email to the supplied address without revealing account existence."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Create a one-time reset token and send an email when the account exists."""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.filter(email=email).first()
        if user is not None:
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
            token = PasswordResetToken.objects.create(user=user, token=secrets.token_urlsafe(32))
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token.token}"
            send_mail(
                'TenantPlus — Password Reset Request',
                (
                    f"Hello {user.full_name},\n\n"
                    "You requested a password reset for your TenantPlus account.\n\n"
                    "Click the link below to reset your password.\n"
                    "This link expires in 30 minutes.\n\n"
                    f"{reset_url}\n\n"
                    "If you did not request this, please ignore this email.\n\n"
                    "— The TenantPlus Team"
                ),
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        return Response({'detail': 'If this email is registered, a reset link has been sent.'}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """Allow a user to reset their password using a single-use token."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Validate the reset token, change the password, and invalidate other tokens."""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_str = serializer.validated_data['token']
        try:
            reset_token = PasswordResetToken.objects.get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
        if reset_token.is_used:
            return Response({'detail': 'This token has already been used.'}, status=status.HTTP_400_BAD_REQUEST)
        if reset_token.is_expired():
            return Response({'detail': 'Token has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        reset_token.is_used = True
        reset_token.save()
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
        return Response({'detail': 'Password reset successful. You can now log in.'}, status=status.HTTP_200_OK)


class DocumentListCreateView(APIView):
    """Allow an authenticated user to list and upload identity documents."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return the authenticated user's uploaded documents."""
        documents = UserDocument.objects.filter(user=request.user)
        serializer = UserDocumentSerializer(documents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """Create a document record linked to the authenticated user."""
        serializer = UserDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
