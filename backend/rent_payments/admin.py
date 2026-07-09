from django.contrib import admin

from .models import EsewaPaymentLog, RentPayment


@admin.register(RentPayment)
class RentPaymentAdmin(admin.ModelAdmin):
    list_display = ('agreement', 'amount', 'payment_month', 'receipt_no', 'is_late', 'late_fee', 'paid_at')


@admin.register(EsewaPaymentLog)
class EsewaPaymentLogAdmin(admin.ModelAdmin):
    list_display = ('agreement', 'payment_month', 'amount', 'transaction_uuid', 'status', 'created_at')
