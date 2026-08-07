import uuid

from django.conf import settings
from django.db import models


class Dispute(models.Model):
    DISPUTE_DEPOSIT_DEDUCTION = 'deposit_deduction'
    DISPUTE_RENT_INCREASE = 'rent_increase'
    DISPUTE_MAINTENANCE_NEGLECT = 'maintenance_neglect'
    DISPUTE_EVICTION = 'eviction'
    DISPUTE_PAYMENT = 'payment_dispute'
    DISPUTE_GENERAL = 'general'

    DISPUTE_TYPE_CHOICES = (
        (DISPUTE_DEPOSIT_DEDUCTION, 'Deposit Deduction'),
        (DISPUTE_RENT_INCREASE, 'Rent Increase'),
        (DISPUTE_MAINTENANCE_NEGLECT, 'Maintenance Neglect'),
        (DISPUTE_EVICTION, 'Eviction'),
        (DISPUTE_PAYMENT, 'Payment Dispute'),
        (DISPUTE_GENERAL, 'General'),
    )

    STATUS_OPEN = 'open'
    STATUS_UNDER_REVIEW = 'under_review'
    STATUS_RESOLVED = 'resolved'
    STATUS_DISMISSED = 'dismissed'

    STATUS_CHOICES = (
        (STATUS_OPEN, 'Open'),
        (STATUS_UNDER_REVIEW, 'Under Review'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_DISMISSED, 'Dismissed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey('agreements.Agreement', on_delete=models.CASCADE, related_name='disputes', null=True, blank=True)
    filed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='disputes_filed',
    )
    dispute_type = models.CharField(max_length=30, choices=DISPUTE_TYPE_CHOICES)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    dispute_no = models.CharField(max_length=20, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    admin_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.dispute_no} — {self.dispute_type} — {self.subject[:20]}"

    def generate_dispute_no(self):
        from datetime import date

        today = date.today()
        count = Dispute.objects.filter(created_at__year=today.year, created_at__month=today.month).count()
        return f"DS-{today.strftime('%Y%m')}-{count + 1:04d}"

    def save(self, *args, **kwargs):
        if not self.dispute_no:
            self.dispute_no = self.generate_dispute_no()

        if self.status in {self.STATUS_RESOLVED, self.STATUS_DISMISSED} and self.resolved_at is None:
            from django.utils import timezone

            self.resolved_at = timezone.now()

        super().save(*args, **kwargs)