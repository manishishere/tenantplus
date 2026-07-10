from django.contrib import admin

from .models import Dispute


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ('dispute_no', 'agreement', 'filed_by', 'dispute_type', 'status', 'created_at')