from django.contrib import admin

from .models import Property, PropertyPhoto, SavedProperty


class PropertyPhotoAdminInline(admin.TabularInline):
    """Inline editor for property photos inside the property admin form."""

    model = PropertyPhoto
    extra = 0
    fields = ('photo_url', 'sort_order')


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    """Admin view for rental property listings."""

    list_display = ('title', 'landlord', 'district', 'room_type', 'rent_amount', 'is_available', 'created_at')
    list_filter = ('room_type', 'furnishing_status', 'is_available', 'district')
    search_fields = ('title', 'description', 'landlord__email', 'district')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    raw_id_fields = ('landlord',)
    inlines = (PropertyPhotoAdminInline,)


@admin.register(PropertyPhoto)
class PropertyPhotoAdmin(admin.ModelAdmin):
    """Admin view for uploaded property photos."""

    list_display = ('property', 'sort_order', 'created_at')
    search_fields = ('property__title',)


@admin.register(SavedProperty)
class SavedPropertyAdmin(admin.ModelAdmin):
    """Admin view for properties saved by tenants."""

    list_display = ('tenant', 'property', 'saved_at')
    search_fields = ('tenant__email', 'property__title')
    ordering = ('-saved_at',)
