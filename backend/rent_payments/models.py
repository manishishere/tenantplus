import uuid
from datetime import date
from decimal import Decimal

from django.db import models


class RentPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey('agreements.Agreement', on_delete=models.CASCADE, related_name='rent_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_month = models.DateField()
    paid_at = models.DateTimeField(auto_now_add=True)
    receipt_no = models.CharField(max_length=50, unique=True, blank=True)
    is_late = models.BooleanField(default=False)
    late_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_month']
        unique_together = ('agreement', 'payment_month')

    def __str__(self):
        return f"{self.agreement.tenant.email} — {self.payment_month.strftime('%B %Y')} — Receipt: {self.receipt_no}"

    def generate_receipt_no(self):
        count = RentPayment.objects.filter(
            payment_month__year=self.payment_month.year,
            payment_month__month=self.payment_month.month,
        ).count()
        return f"TP-{self.payment_month.strftime('%Y%m')}-{count + 1:04d}"

    def calculate_late_fee(self):
        due_date = self.payment_month.replace(day=7)
        if date.today() > due_date:
            self.is_late = True
            self.late_fee = Decimal('500.00')
        else:
            self.is_late = False
            self.late_fee = Decimal('0.00')

    def save(self, *args, **kwargs):
        self.calculate_late_fee()
        if not self.receipt_no:
            self.receipt_no = self.generate_receipt_no()
        super().save(*args, **kwargs)


class EsewaPaymentLog(models.Model):
    """Track eSewa payment attempts and their outcomes."""

    STATUS_PENDING = 'pending'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED, 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey(
        'agreements.Agreement',
        on_delete=models.CASCADE,
        related_name='esewa_logs',
    )
    payment_month = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_uuid = models.CharField(max_length=100, unique=True)
    esewa_ref_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rent_payment = models.OneToOneField(
        RentPayment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='esewa_log',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"{self.agreement.tenant.email} — "
            f"{self.payment_month.strftime('%B %Y')} — "
            f"{self.status}"
        )
