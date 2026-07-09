from django.contrib import admin

from .models import MaintenanceImage, MaintenanceRequest


class MaintenanceImageInline(admin.TabularInline):
    model = MaintenanceImage
    extra = 0


@admin.register(MaintenanceRequest)
class MaintenanceRequestAdmin(admin.ModelAdmin):
    list_display = ('ticket_no', 'property', 'tenant', 'priority', 'status', 'created_at')
    inlines = [MaintenanceImageInline]
