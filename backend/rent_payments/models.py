import uuid
from datetime import date
from decimal import Decimal

from django.db import models
from simple_history.models import HistoricalRecords


def generate_esewa_transaction_uuid():
    return f"PAY-{uuid.uuid4()}"


class RentPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey('agreements.Agreement', on_delete=models.CASCADE, related_name='rent_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_month = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True, default=None)
    receipt_no = models.CharField(max_length=50, blank=True, default='')
    is_late = models.BooleanField(default=False)
    late_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    late_fee_applied_by_landlord = models.BooleanField(default=False)  # Landlord must manually trigger
    notes = models.TextField(blank=True)
    esewa_verified = models.BooleanField(default=False)
    history = HistoricalRecords()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_month']
        unique_together = ('agreement', 'payment_month')

    def __str__(self):
        return f"{self.agreement.tenant.email} — {self.payment_month.strftime('%B %Y')} — Receipt: {self.receipt_no or 'Pending'}"

    def generate_receipt_no(self):
        count = RentPayment.objects.filter(
            payment_month__year=self.payment_month.year,
            payment_month__month=self.payment_month.month,
            paid_at__isnull=False,
        ).count()
        return f"TP-{self.payment_month.strftime('%Y%m')}-{count + 1:04d}"

    def calculate_late_fee(self):
        from datetime import timedelta
        # Calculate monthly due date based on agreement start date day-of-month
        start_day = self.agreement.start_date.day
        try:
            due_date = self.payment_month.replace(day=min(start_day, 28)) + timedelta(days=9)
        except Exception:
            due_date = self.payment_month + timedelta(days=9)

        if date.today() > due_date:
            self.is_late = True
            self.late_fee = Decimal('500.00')
        else:
            self.is_late = False
            self.late_fee = Decimal('0.00')

    def save(self, *args, **kwargs):
        if self.paid_at and not self.receipt_no:
            self.receipt_no = self.generate_receipt_no()
        super().save(*args, **kwargs)


class EsewaPaymentLog(models.Model):
    """Track eSewa payment attempts and their outcomes."""

    STATUS_PENDING = 'PENDING'
    STATUS_COMPLETE = 'COMPLETE'
    STATUS_FAILED = 'FAILED'
    STATUS_TAMPERED = 'TAMPERED'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETE, 'Complete'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_TAMPERED, 'Tampered'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(
        RentPayment,
        on_delete=models.CASCADE,
        related_name='esewa_logs',
        null=True,
        blank=True,
    )
    transaction_uuid = models.CharField(max_length=100, unique=True, default=generate_esewa_transaction_uuid)
    transaction_code = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    raw_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"{self.payment.agreement.tenant.email} — "
            f"{self.transaction_uuid} — "
            f"{self.status}"
        )

    def save(self, *args, **kwargs):
        previous_status = None
        if self.pk:
            previous_status = EsewaPaymentLog.objects.filter(pk=self.pk).values_list('status', flat=True).first()

        super().save(*args, **kwargs)

        if self.status == self.STATUS_COMPLETE and previous_status != self.STATUS_COMPLETE and self.payment_id:
            if not self.payment.esewa_verified:
                RentPayment.objects.filter(pk=self.payment_id).update(esewa_verified=True)
