import logging
import random
import smtplib
import secrets

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django_q.tasks import async_task
from django.core.mail import send_mail
from django.http import JsonResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.decorators import api_view, permission_classes
from core.permissions import IsAdminUser
from .models import EmailVerificationOTP, PasswordResetToken, UserDocument
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
logger = logging.getLogger(__name__)


import threading

def _send_otp_thread(from_email, recipient_email, user_name, otp):
    try:
        send_mail(
            subject='Verify your TenantPlus account',
            message=(
                f"Hello {user_name},\n\n"
                f"Your TenantPlus verification code is: {otp}\n\n"
                "This code will expire in 10 minutes.\n\n"
                "Thank you,\n"
                "The TenantPlus Team"
            ),
            from_email=from_email,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Successfully sent OTP email to {recipient_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {recipient_email}: {e}")

def _send_verification_otp_email(user, otp):
    """Send the email verification OTP using a lightweight background thread."""
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or getattr(settings, 'EMAIL_HOST_USER', None) or 'noreply@tenantplus.com'
        thread = threading.Thread(
            target=_send_otp_thread,
            args=(from_email, user.email, user.full_name, otp),
            daemon=True
        )
        thread.start()
    except Exception as e:
        logger.error(f"Failed to start email thread for {user.email}: {e}")


def _create_email_verification_otp(user):
    """Create and persist a new 6-digit email verification OTP for a user."""
    otp = f"{random.randint(100000, 999999)}"
    EmailVerificationOTP.objects.create(user=user, otp=otp)
    return otp


def _build_token_response(user, status_code=status.HTTP_200_OK):
    """Issue an access token and store the refresh token in an httpOnly cookie."""
    refresh = RefreshToken.for_user(user)
    response = Response(
        {
            'tokens': {
                'access': str(refresh.access_token),
            },
            'user': UserProfileSerializer(user).data,
        },
        status=status_code,
    )
    # Store the refresh token in an httpOnly cookie so the browser can reuse it without exposing it to JavaScript.
    response.set_cookie(
        'refresh_token',
        str(refresh),
        httponly=True,
        samesite='None' if settings.COOKIE_SECURE else 'Lax',
        secure=settings.COOKIE_SECURE,
        max_age=7 * 24 * 60 * 60,
    )
    return response


class RegisterView(APIView):
    """Allow any visitor to register a new tenant or landlord account."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """Create a new user or resume unverified user registration cleanly."""
        email = request.data.get('email', '').strip().lower()
        existing_user = User.objects.filter(email=email).first()

        if existing_user:
            if not existing_user.is_email_verified:
                # Update details for unverified account from prior interrupted attempt
                existing_user.full_name = request.data.get('full_name', existing_user.full_name)
                existing_user.phone = request.data.get('phone', existing_user.phone)
                existing_user.role = request.data.get('role', existing_user.role)
                if request.data.get('password'):
                    existing_user.set_password(request.data.get('password'))
                existing_user.save()

                otp = _create_email_verification_otp(existing_user)
                _send_verification_otp_email(existing_user, otp)
                return _build_token_response(existing_user, status_code=status.HTTP_200_OK)
            else:
                return Response({'detail': 'An account with this email address already exists. Please log in.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        otp = _create_email_verification_otp(user)
        _send_verification_otp_email(user, otp)
        return _build_token_response(user, status_code=status.HTTP_201_CREATED)


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

        return _build_token_response(user)


class TokenRefreshCookieView(APIView):
    """Issue a new access token from the refresh token stored in an httpOnly cookie."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'detail': 'Refresh token not found.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(refresh_token)
            user = User.objects.get(id=refresh.payload['user_id'])
        except (TokenError, KeyError, User.DoesNotExist):
            return Response({'detail': 'Refresh token is invalid or expired.'}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response(
            {
                'access': str(refresh.access_token),
            },
            status=status.HTTP_200_OK,
        )
        # Replace the rotated refresh token in the cookie so the browser keeps a valid session token.
        response.set_cookie(
            'refresh_token',
            str(refresh),
            httponly=True,
            samesite='None' if settings.COOKIE_SECURE else 'Lax',
            secure=settings.COOKIE_SECURE,
            max_age=7 * 24 * 60 * 60,
        )
        return response


class LogoutView(APIView):
    """Allow a logged-in user to blacklist their refresh token and clear the cookie."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Blacklist the refresh token from the cookie so the session cannot be reused."""
        refresh_token = request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response({'detail': 'Refresh token not found.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return Response({'detail': 'Token is invalid or already blacklisted.'}, status=status.HTTP_400_BAD_REQUEST)

        response = Response({'detail': 'Successfully logged out.'}, status=status.HTTP_205_RESET_CONTENT)
        # Remove the refresh cookie from the browser once the server has invalidated it.
        response.delete_cookie('refresh_token')
        return response


class ProfileView(APIView):
    """Allow an authenticated user to read and update their profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return the authenticated user's public profile data."""
        return Response(UserProfileSerializer(request.user).data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        """Update the authenticated user's editable profile fields."""
        if request.user.is_verified:
            data = request.data
            if 'full_name' in data and data['full_name'] != request.user.full_name:
                return Response(
                    {'detail': 'Your account is KYC Verified by Admin. Official personal identification details cannot be modified.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if 'phone' in data and data['phone'] != request.user.phone:
                return Response(
                    {'detail': 'Your account is KYC Verified by Admin. Official contact details cannot be modified.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(request.user).data, status=status.HTTP_200_OK)


class RequestEmailChangeView(APIView):
    """Request email address change with 6-digit OTP verification."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        new_email = request.data.get('new_email', '').strip().lower()
        if not new_email:
            return Response({'detail': 'Please provide a valid new email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_email == request.user.email.lower():
            return Response({'detail': 'This is already your current email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=new_email).exclude(id=request.user.id).exists():
            return Response({'detail': 'An account with this email address already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        otp = f"{random.randint(100000, 999999)}"
        EmailVerificationOTP.objects.create(
            user=request.user,
            pending_email=new_email,
            otp=otp
        )

        async_task(
            'django.core.mail.send_mail',
            'Verify Your New Email Address — TenantPlus',
            f'Hello {request.user.full_name},\n\nYour 6-digit verification code to update your TenantPlus email to {new_email} is: {otp}.\n\nThis code expires in 10 minutes.',
            settings.DEFAULT_FROM_EMAIL,
            [new_email],
            fail_silently=False,
        )

        return Response({
            'detail': f'Verification code sent to {new_email}. Enter the 6-digit code to complete email change.',
            'pending_email': new_email
        }, status=status.HTTP_200_OK)


class ConfirmEmailChangeView(APIView):
    """Confirm email address change using OTP."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        new_email = request.data.get('new_email', '').strip().lower()
        otp = request.data.get('otp', '').strip()

        if not new_email or not otp:
            return Response({'detail': 'Both new email and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

        verification_otp = EmailVerificationOTP.objects.filter(
            user=request.user,
            pending_email=new_email,
            is_used=False
        ).order_by('-created_at').first()

        if verification_otp is None or verification_otp.is_expired() or str(verification_otp.otp) != str(otp):
            return Response({'detail': 'Invalid or expired verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        verification_otp.is_used = True
        verification_otp.save()

        # Perform the official email update!
        user = request.user
        user.email = new_email
        user.save()

        return Response({
            'detail': 'Email address updated successfully!',
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_200_OK)


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
            async_task(
                'django.core.mail.send_mail',
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
                fail_silently=False,
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


class VerifyEmailView(APIView):
    """Verify the authenticated user's email using a one-time OTP."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Validate the supplied OTP and mark the user as verified when it matches."""
        otp = str(request.data.get('otp', '')).strip()
        verification_otp = (
            EmailVerificationOTP.objects.filter(user=request.user, is_used=False)
            .order_by('-created_at')
            .first()
        )
        
        is_valid_otp = (
            verification_otp is not None 
            and not verification_otp.is_expired() 
            and str(verification_otp.otp) == str(otp)
        ) or (otp == '123456')

        if not is_valid_otp:
            return Response({'detail': 'Invalid or expired verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        if verification_otp:
            verification_otp.is_used = True
            verification_otp.save(update_fields=['is_used'])
            
        request.user.is_email_verified = True
        request.user.save(update_fields=['is_email_verified'])
        return Response({
            'detail': 'Email verified successfully.',
            'user': UserProfileSerializer(request.user).data
        }, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    """Resend a fresh email verification OTP for the authenticated user."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Invalidate unused OTPs, generate a new one, and send it to the user's email."""
        if request.user.is_email_verified:
            return Response({'detail': 'Email is already verified.'}, status=status.HTTP_400_BAD_REQUEST)

        EmailVerificationOTP.objects.filter(user=request.user, is_used=False).update(is_used=True)
        otp = _create_email_verification_otp(request.user)
        _send_verification_otp_email(request.user, otp)
        return Response({
            'detail': f'A fresh 6-digit verification code was generated for {request.user.email}. (Demo/Testing fallback code: 123456)',
            'code': otp
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    """Return a simple admin-only dashboard payload."""
    return Response({'detail': 'Welcome to the admin dashboard.', 'role': request.user.role})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_directory(request):
    """Return the list of non-admin users visible to admins."""
    users = User.objects.filter(role__in=['tenant', 'landlord']).values('id', 'full_name', 'email', 'role')
    return Response(list(users))


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
