from django.contrib import admin

from .models import MoveOutInspection


@admin.register(MoveOutInspection)
class MoveOutInspectionAdmin(admin.ModelAdmin):
    list_display = ('report_no', 'agreement', 'inspector', 'inspection_date', 'structural_condition', 'is_finalized', 'created_at')
