import uuid
from datetime import date
from decimal import Decimal

from django.db import models


class MoveOutInspection(models.Model):
    STRUCTURAL_GOOD = 'good'
    STRUCTURAL_FAIR = 'fair'
    STRUCTURAL_DAMAGED = 'damaged'

    STRUCTURAL_CHOICES = (
        (STRUCTURAL_GOOD, 'Good'),
        (STRUCTURAL_FAIR, 'Fair'),
        (STRUCTURAL_DAMAGED, 'Damaged'),
    )

    UTILITY_CLEARED = 'cleared'
    UTILITY_PENDING_BILLS = 'pending_bills'

    UTILITY_CHOICES = (
        (UTILITY_CLEARED, 'Cleared'),
        (UTILITY_PENDING_BILLS, 'Pending Bills'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.OneToOneField('agreements.Agreement', on_delete=models.CASCADE, related_name='move_out_inspection')
    inspector = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='conducted_inspections')
    inspection_date = models.DateField()
    structural_condition = models.CharField(max_length=20, choices=STRUCTURAL_CHOICES, default=STRUCTURAL_GOOD)
    utility_status = models.CharField(max_length=20, choices=UTILITY_CHOICES, default=UTILITY_CLEARED)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    deduction_reason = models.TextField(blank=True)
    refund_amount_calculated = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    is_finalized = models.BooleanField(default=False)
    report_no = models.CharField(max_length=50, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-inspection_date']

    def __str__(self):
        return f"{self.report_no} — {self.agreement.property.title[:20]} ({'finalized' if self.is_finalized else 'draft'})"

    def generate_report_no(self):
        today = date.today()
        count = MoveOutInspection.objects.filter(
            created_at__year=today.year,
            created_at__month=today.month,
        ).count()
        return f"INSP-{today.strftime('%Y%m')}-{count + 1:04d}"

    def save(self, *args, **kwargs):
        if self.agreement_id:
            self.refund_amount_calculated = self.agreement.security_deposit - self.total_deductions
        if not self.report_no:
            self.report_no = self.generate_report_no()

        previous_is_finalized = None
        if self.pk:
            previous_is_finalized = MoveOutInspection.objects.filter(pk=self.pk).values_list('is_finalized', flat=True).first()

        super().save(*args, **kwargs)

        if previous_is_finalized is False and self.is_finalized and self.agreement.status != self.agreement.STATUS_TERMINATED:
            self.agreement.status = self.agreement.STATUS_TERMINATED
            self.agreement.save()
