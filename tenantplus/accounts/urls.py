from django.urls import path

from .views import (
    ChangePasswordView,
    DocumentListCreateView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    ProfileView,
    RegisterView,
    TokenRefreshCookieView,
    admin_dashboard,
    user_directory,
)

urlpatterns = [
    path('register', RegisterView.as_view()),
    path('register/', RegisterView.as_view(), name='register'),
    path('login', LoginView.as_view()),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh', TokenRefreshCookieView.as_view()),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='refresh-token'),
    path('logout', LogoutView.as_view()),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile', ProfileView.as_view()),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password', ChangePasswordView.as_view()),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/request', PasswordResetRequestView.as_view()),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm', PasswordResetConfirmView.as_view()),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('documents', DocumentListCreateView.as_view()),
    path('documents/', DocumentListCreateView.as_view(), name='documents'),
    path('admin/dashboard', admin_dashboard, name='admin-dashboard'),
    path('users', user_directory, name='user-directory'),
]
