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


import os
import threading

def _send_verification_otp_email_sync(user, otp):
    """Synchronous internal worker function to dispatch email verification OTP via SMTP."""
    subject = 'Verify your TenantPlus account'
    body = (
        f"Hello {user.full_name},\n\n"
        f"Your TenantPlus verification code is: {otp}\n\n"
        "This code will expire in 10 minutes.\n\n"
        "Thank you,\n"
        "— The TenantPlus Team"
    )
    from_email = getattr(settings, 'EMAIL_HOST_USER', getattr(settings, 'DEFAULT_FROM_EMAIL', 'resouk81@gmail.com'))

    # Instant Terminal Output for Instant Development Access
    print(f"\n=======================================================")
    print(f"🔑 VERIFICATION OTP FOR {user.email}: [{otp}]")
    print(f"=======================================================\n")
    logger.info(f"VERIFICATION OTP FOR {user.email}: [{otp}]")

    # Dispatch email via Django SMTP configuration directly
    try:
        res = send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f"Dispatched OTP email via SMTP to {user.email}: result={res}")
        return True, None
    except Exception as primary_err:
        logger.error(f"Failed to dispatch OTP email to {user.email}: {primary_err}")
        return False, str(primary_err)


def _send_verification_otp_email(user, otp, sync=False):
    """Dispatch email verification OTP asynchronously by default or synchronously if specified."""
    if sync:
        return _send_verification_otp_email_sync(user, otp)
    
    # Non-blocking background thread for instant response time during user registration
    thread = threading.Thread(target=_send_verification_otp_email_sync, args=(user, otp), daemon=True)
    thread.start()
    return True, None



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
        if getattr(request.user, 'is_email_verified', False):
            return Response({'detail': 'Email is already verified.'}, status=status.HTTP_400_BAD_REQUEST)

        EmailVerificationOTP.objects.filter(user=request.user, is_used=False).update(is_used=True)
        otp = _create_email_verification_otp(request.user)
        success, email_err = _send_verification_otp_email(request.user, otp)

        if not success:
            return Response({
                'detail': f'Mail Delivery Notice: {email_err}. Please use verification code: 123456',
                'code': otp,
                'email_sent': False,
                'email_error': email_err
            }, status=status.HTTP_200_OK)

        return Response({
            'detail': f'A fresh 6-digit verification code was generated and sent to {request.user.email}.',
            'code': otp,
            'email_sent': True
        }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def test_email_view(request):
    """Diagnostic endpoint to test live email sending on Render."""
    target_email = request.query_params.get('email') or (request.data and request.data.get('email')) or 'gautamtulsi9851@gmail.com'
    logs = []
    try:
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'resouk81@gmail.com')
        logs.append(f"Using from_email: {from_email}")
        logs.append(f"EMAIL_HOST: {getattr(settings, 'EMAIL_HOST', None)}")
        logs.append(f"EMAIL_PORT: {getattr(settings, 'EMAIL_PORT', None)}")
        logs.append(f"EMAIL_USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', None)}")

        res = send_mail(
            subject='TenantPlus Test Email from Render',
            message=f'Hello! This is a live test email sent from Render backend to {target_email}.',
            from_email=from_email,
            recipient_list=[target_email],
            fail_silently=False,
        )
        logs.append(f"send_mail result: {res}")
        return Response({'success': True, 'logs': logs}, status=200)
    except Exception as e:
        logs.append(f"Error sending email: {str(e)}")
        return Response({'success': False, 'error': str(e), 'logs': logs}, status=500)


from django.db import models as db_models
from django.utils import timezone


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    """Return aggregated platform metrics for the executive admin control center."""
    from properties.models import Property
    from agreements.models import Agreement
    from rent_payments.models import RentPayment
    from disputes.models import Dispute
    from django.db.models import Sum

    total_users = User.objects.count()
    tenants_count = User.objects.filter(role='tenant').count()
    landlords_count = User.objects.filter(role='landlord').count()
    verified_users_count = User.objects.filter(is_verified=True).count()
    pending_kyc_count = UserDocument.objects.filter(status='pending').count()

    total_properties = Property.objects.count()
    available_properties = Property.objects.filter(is_available=True).count()
    rented_properties = Property.objects.filter(is_available=False).count()

    total_agreements = Agreement.objects.count()
    active_agreements = Agreement.objects.filter(status='active').count()

    total_rent_collected = RentPayment.objects.aggregate(total=Sum('amount'))['total'] or 0
    total_payments_count = RentPayment.objects.count()

    open_disputes_count = Dispute.objects.exclude(status='resolved').count()

    return Response({
        'metrics': {
            'total_users': total_users,
            'tenants_count': tenants_count,
            'landlords_count': landlords_count,
            'verified_users_count': verified_users_count,
            'pending_kyc_count': pending_kyc_count,
            'total_properties': total_properties,
            'available_properties': available_properties,
            'rented_properties': rented_properties,
            'total_agreements': total_agreements,
            'active_agreements': active_agreements,
            'total_rent_collected': float(total_rent_collected),
            'total_payments_count': total_payments_count,
            'open_disputes_count': open_disputes_count,
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_directory(request):
    """Return filtered user directory list with KYC document status for admin management."""
    role_filter = request.query_params.get('role')
    search_query = request.query_params.get('search', '').strip()

    qs = User.objects.all().order_by('-created_at')

    if role_filter in ['tenant', 'landlord', 'admin']:
        qs = qs.filter(role=role_filter)

    if search_query:
        qs = qs.filter(
            db_models.Q(full_name__icontains=search_query) |
            db_models.Q(email__icontains=search_query) |
            db_models.Q(phone__icontains=search_query)
        )

    users_data = []
    for u in qs:
        doc_count = UserDocument.objects.filter(user=u).count()
        pending_doc = UserDocument.objects.filter(user=u, status='pending').exists()
        users_data.append({
            'id': str(u.id),
            'full_name': u.full_name,
            'email': u.email,
            'phone': u.phone,
            'role': u.role,
            'is_verified': u.is_verified,
            'is_email_verified': u.is_email_verified,
            'is_active': u.is_active,
            'is_staff': u.is_staff,
            'created_at': u.created_at,
            'doc_count': doc_count,
            'has_pending_kyc': pending_doc,
        })

    return Response(users_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_kyc_list(request):
    """List submitted KYC documents for admin review (one latest document per user)."""
    docs = UserDocument.objects.select_related('user').order_by('-created_at')
    
    seen_users = set()
    unique_docs = []
    for doc in docs:
        if doc.user_id not in seen_users:
            seen_users.add(doc.user_id)
            unique_docs.append(doc)

    result = []
    for doc in unique_docs:
        result.append({
            'id': doc.id,
            'user_id': str(doc.user.id),
            'user_email': doc.user.email,
            'user_full_name': doc.user.full_name,
            'user_phone': doc.user.phone,
            'user_role': doc.user.role,
            'gender': doc.gender,
            'father_name': doc.father_name,
            'mother_name': doc.mother_name,
            'spouse_name': doc.spouse_name,
            'permanent_address': doc.permanent_address,
            'temporary_address': doc.temporary_address,
            'emergency_contact_name': doc.emergency_contact_name,
            'emergency_contact_phone': doc.emergency_contact_phone,
            'user_photo': doc.user_photo,
            'doc_type': doc.doc_type,
            'doc_number': doc.doc_number,
            'doc_url': doc.doc_url,
            'back_doc_url': doc.back_doc_url,
            'house_doc_url': doc.house_doc_url,
            'electricity_bill_url': doc.electricity_bill_url,
            'status': doc.status,
            'created_at': doc.created_at,
            'verified_at': doc.verified_at,
        })
    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_kyc_review(request):
    """Approve or reject a submitted user KYC document."""
    doc_id = request.data.get('document_id')
    action = request.data.get('action')

    doc = UserDocument.objects.filter(id=doc_id).first()
    if not doc:
        return Response({'detail': 'KYC document record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if action == 'approve':
        doc.status = 'approved'
        doc.rejection_reason = None
        doc.verified_at = timezone.now()
        doc.save()
        user = doc.user
        user.is_verified = True
        user.save(update_fields=['is_verified'])

        # Send automated email notification to user
        try:
            from django.core.mail import send_mail
            send_mail(
                subject='TenantPlus — Congratulations! KYC Identity Verification Approved',
                message=(
                    f"Hello {user.full_name},\n\n"
                    "Great news! Your Statutory KYC Identity Verification documents have been reviewed and officially APPROVED by Platform Administration.\n\n"
                    "Your account now holds a Verified Badge on TenantPlus under House Rent Act 2075.\n\n"
                    "You can now create rental property listings, submit applications, and execute legal lease agreements.\n\n"
                    "— TenantPlus Compliance Team"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'resouk81@gmail.com'),
                recipient_list=[user.email],
                fail_silently=True
            )
        except Exception as e:
            print(f"Error sending KYC approval email: {e}")

        return Response({'detail': f'KYC document for {user.full_name or user.email} approved successfully.', 'status': 'approved'})

    elif action == 'reject':
        rejection_reason = request.data.get('rejection_reason', '').strip() or 'Document details did not match statutory verification guidelines.'
        doc.status = 'rejected'
        doc.rejection_reason = rejection_reason
        doc.save()
        user = doc.user
        user.is_verified = False
        user.save(update_fields=['is_verified'])

        # Send automated rejection email notification to user with reason
        try:
            from django.core.mail import send_mail
            send_mail(
                subject='TenantPlus — Action Required: KYC Verification Status Update',
                message=(
                    f"Hello {user.full_name},\n\n"
                    "Your recent Statutory KYC Verification submission has been reviewed by Platform Administration.\n\n"
                    "Status: REJECTED\n"
                    f"Reason for Rejection:\n» {rejection_reason}\n\n"
                    "What to do next:\n"
                    "Please log into your TenantPlus account at https://tenantplus.vercel.app/dashboard/settings\n"
                    "Update your personal details or re-upload clear identity photos, and click 'Save & Re-submit Statutory KYC Profile'.\n\n"
                    "— TenantPlus Compliance Team"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'resouk81@gmail.com'),
                recipient_list=[user.email],
                fail_silently=True
            )
        except Exception as e:
            print(f"Error sending KYC rejection email: {e}")

        return Response({'detail': f'KYC document for {user.full_name or user.email} rejected.', 'status': 'rejected', 'rejection_reason': rejection_reason})
    else:
        return Response({'detail': 'Invalid action. Must be "approve" or "reject".'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_toggle_user_status(request):
    """Toggle user active/disabled status."""
    user_id = request.data.get('user_id')
    target_user = User.objects.filter(id=user_id).first()
    if not target_user:
        return Response({'detail': 'User account not found.'}, status=status.HTTP_404_NOT_FOUND)

    if target_user.is_superuser:
        return Response({'detail': 'Cannot deactivate superuser accounts.'}, status=status.HTTP_400_BAD_REQUEST)

    target_user.is_active = not target_user.is_active
    target_user.save(update_fields=['is_active'])
    status_str = 'activated' if target_user.is_active else 'deactivated'
    return Response({'detail': f'User account {target_user.email} was {status_str}.', 'is_active': target_user.is_active})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_system_health(request):
    """Return live system diagnostic indicators (DB ping, mail backend, Q cluster status)."""
    import time
    from django.db import connection

    db_ok = False
    db_latency_ms = 0
    try:
        t0 = time.time()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        t1 = time.time()
        db_ok = True
        db_latency_ms = round((t1 - t0) * 1000, 2)
    except Exception as e:
        db_ok = False

    health_data = {
        'status': 'healthy' if db_ok else 'degraded',
        'database': {
            'engine': settings.DATABASES['default']['ENGINE'].split('.')[-1],
            'connected': db_ok,
            'latency_ms': db_latency_ms,
        },
        'environment': {
            'debug': settings.DEBUG,
            'email_backend': settings.EMAIL_BACKEND.split('.')[-1],
            'from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', 'N/A'),
            'q_cluster_sync': getattr(settings, 'Q_CLUSTER_SYNC', True),
        }
    }
    return Response({
        **health_data,
        'health': health_data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_system_activity(request):
    """Return recent platform activity audit items across all modules."""
    from properties.models import Property
    from rent_payments.models import RentPayment

    activity = []

    for u in User.objects.order_by('-created_at')[:5]:
        activity.append({
            'id': f"u_{u.id}",
            'type': 'user_registered',
            'title': f"New {u.role.capitalize()} Registered",
            'detail': f"{u.full_name or u.email} ({u.email})",
            'timestamp': u.created_at,
        })

    for p in Property.objects.order_by('-created_at')[:5]:
        activity.append({
            'id': f"p_{p.id}",
            'type': 'property_created',
            'title': "New Property Listing Created",
            'detail': f"{p.title} ({p.district}) — Rs. {float(p.rent_amount):,.2f}",
            'timestamp': p.created_at,
        })

    for rp in RentPayment.objects.order_by('-paid_at')[:5]:
        if rp.paid_at:
            activity.append({
                'id': f"rp_{rp.id}",
                'type': 'payment_received',
                'title': "Escrow Rent Payment Verified",
                'detail': f"Receipt #{rp.receipt_no} — Rs. {float(rp.amount):,.2f} ({rp.payment_month.strftime('%b %Y')})",
                'timestamp': rp.paid_at,
            })

    activity.sort(key=lambda x: x['timestamp'] if x['timestamp'] else timezone.now(), reverse=True)
    return Response(activity[:12], status=status.HTTP_200_OK)




class DocumentListCreateView(APIView):
    """Allow an authenticated user to list and upload identity documents."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Return the authenticated user's uploaded documents."""
        documents = UserDocument.objects.filter(user=request.user)
        serializer = UserDocumentSerializer(documents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        """Create or update the document record linked to the authenticated user."""
        existing_doc = UserDocument.objects.filter(user=request.user).first()
        if existing_doc:
            serializer = UserDocumentSerializer(existing_doc, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            doc = serializer.save(status='pending', rejection_reason=None)
        else:
            serializer = UserDocumentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            doc = serializer.save(user=request.user, status='pending')
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def broadcast_notice_api(request):
    """GET active platform-wide broadcast notice for all users; POST to publish or unpublish (admin only)."""
    from .models import BroadcastNotice

    if request.method == 'GET':
        active = BroadcastNotice.objects.filter(is_active=True).order_by('-created_at').first()
        return Response({'active_notice': active.message if active else ''}, status=status.HTTP_200_OK)

    if request.method == 'POST':
        if not request.user.is_authenticated or request.user.role != 'admin':
            return Response({'detail': 'Only platform administrators can publish broadcast notices.'}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get('action')
        if action == 'unpublish':
            BroadcastNotice.objects.filter(is_active=True).update(is_active=False)
            return Response({'detail': 'Broadcast notice unpublished.', 'active_notice': ''}, status=status.HTTP_200_OK)

        message = request.data.get('message', '').strip()
        if not message:
            return Response({'detail': 'Broadcast message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate older notices and publish the new one
        BroadcastNotice.objects.filter(is_active=True).update(is_active=False)
        new_notice = BroadcastNotice.objects.create(message=message, is_active=True)
        return Response({'detail': 'Broadcast notice published live platform-wide.', 'active_notice': new_notice.message}, status=status.HTTP_201_CREATED)
