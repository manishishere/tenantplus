from django.contrib import admin
from django.utils import timezone

from .models import PasswordResetToken, User, UserDocument


@admin.action(description='Mark selected documents as verified')
def mark_as_verified(modeladmin, request, queryset):
    """Mark selected documents as verified and stamp them with the current time."""
    queryset.update(status='verified', verified_at=timezone.now())


@admin.action(description='Mark selected documents as rejected')
def mark_as_rejected(modeladmin, request, queryset):
    """Mark selected documents as rejected."""
    queryset.update(status='rejected')


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Manage custom user accounts from the Django admin site."""

    list_display = ('email', 'full_name', 'role', 'is_verified', 'is_active', 'created_at')
    list_filter = ('role', 'is_verified', 'is_active')
    search_fields = ('email', 'full_name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Personal', {'fields': ('full_name', 'email', 'phone')}),
        ('Role & Status', {'fields': ('role', 'is_verified', 'is_active', 'is_staff')}),
        ('Permissions', {'fields': ('groups', 'user_permissions')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(UserDocument)
class UserDocumentAdmin(admin.ModelAdmin):
    """Review and approve uploaded user documents."""

    list_display = ('user', 'doc_type', 'status', 'created_at')
    list_filter = ('doc_type', 'status')
    search_fields = ('user__email',)
    readonly_fields = ('created_at',)
    actions = (mark_as_verified, mark_as_rejected)


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Inspect and manage password reset tokens."""

    list_display = ('user', 'token', 'created_at', 'is_used', 'is_expired')
    list_filter = ('is_used',)
    readonly_fields = ('token', 'created_at')
    ordering = ('-created_at',)

    @admin.display(boolean=True, description='Expired')
    def is_expired(self, obj):
        """Return True when the token has exceeded its lifetime."""
        return obj.is_expired()
