import uuid
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db import models


class Agreement(models.Model):
    """Represent an active tenancy agreement created from an accepted application."""

    STATUS_ACTIVE = 'active'
    STATUS_EXPIRED = 'expired'
    STATUS_TERMINATED = 'terminated'

    STATUS_CHOICES = (
        (STATUS_ACTIVE, 'Active'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_TERMINATED, 'Terminated'),
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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    start_date = models.DateField()
    end_date = models.DateField()
    tenant_acknowledged = models.BooleanField(default=False)
    landlord_acknowledged = models.BooleanField(default=False)
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
