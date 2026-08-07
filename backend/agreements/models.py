import uuid
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db import models
from simple_history.models import HistoricalRecords


class Agreement(models.Model):
    """Represent an active tenancy agreement created from an accepted application."""

    STATUS_ACTIVE = 'active'
    STATUS_EXPIRED = 'expired'
    STATUS_TERMINATED = 'terminated'
    STATUS_PENDING_ADVANCE = 'pending_advance'

    STATUS_CHOICES = (
        (STATUS_ACTIVE, 'Active'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_TERMINATED, 'Terminated'),
        (STATUS_PENDING_ADVANCE, 'Pending Advance Payment'),
    )

    ADVANCE_STATUS_PENDING = 'pending'
    ADVANCE_STATUS_PAID = 'paid'
    ADVANCE_STATUS_EXPIRED = 'expired'

    ADVANCE_PAYMENT_STATUS_CHOICES = (
        (ADVANCE_STATUS_PENDING, 'Pending'),
        (ADVANCE_STATUS_PAID, 'Paid'),
        (ADVANCE_STATUS_EXPIRED, 'Expired - Auto Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(
        'applications.Application',
        on_delete=models.CASCADE,
        related_name='agreement',
    )
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tenant_agreements',
        limit_choices_to={'role': 'tenant'},
    )
    landlord = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='landlord_agreements',
        limit_choices_to={'role': 'landlord'},
    )
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='agreements')
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    start_date = models.DateField()
    end_date = models.DateField()
    tenant_acknowledged = models.BooleanField(default=False)
    landlord_acknowledged = models.BooleanField(default=False)
    signed_document_url = models.CharField(max_length=500, blank=True, null=True)
    landlord_signature_url = models.CharField(max_length=500, blank=True, null=True)
    tenant_signature_url = models.CharField(max_length=500, blank=True, null=True)
    
    # Witness 1 & Witness 2 Legal Verification Fields (Nepal House Rent Act 2075)
    witness1_name = models.CharField(max_length=150, blank=True, null=True)
    witness1_citizenship = models.CharField(max_length=100, blank=True, null=True)
    witness1_phone = models.CharField(max_length=30, blank=True, null=True)

    witness2_name = models.CharField(max_length=150, blank=True, null=True)
    witness2_citizenship = models.CharField(max_length=100, blank=True, null=True)
    witness2_phone = models.CharField(max_length=30, blank=True, null=True)

    signed_doc_status = models.CharField(
        max_length=30,
        choices=(
            ('pending_upload', 'Pending Upload'),
            ('uploaded_pending_ack', 'Uploaded - Pending Review'),
            ('acknowledged', 'Acknowledged by Both'),
            ('rejected', 'Rejected'),
        ),
        default='pending_upload'
    )
    rejection_reason = models.TextField(blank=True, null=True)
    # Advance Payment Enforcement (24-hour window after landlord acceptance)
    advance_payment_status = models.CharField(
        max_length=20,
        choices=ADVANCE_PAYMENT_STATUS_CHOICES,
        default=ADVANCE_STATUS_PENDING
    )
    advance_payment_deadline = models.DateTimeField(null=True, blank=True)
    advance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    history = HistoricalRecords()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tenant.email} — {self.property.title} ({self.start_date} to {self.end_date})"

    def is_expired(self):
        return date.today() > self.end_date

    def proposed_rent_increase(self):
        return self.rent_amount * Decimal('1.10')
