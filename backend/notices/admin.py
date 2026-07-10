from django.contrib import admin

from .models import Notice


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ('notice_no', 'notice_type', 'agreement', 'issued_by', 'effective_date', 'is_acknowledged', 'created_at')
