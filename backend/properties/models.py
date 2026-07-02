import uuid

from django.conf import settings
from django.db import models


class Property(models.Model):
    """Represent a rental property listed by a landlord."""

    ROOM_TYPE_CHOICES = (
        ('single', 'Single Room'),
        ('double', 'Double Room'),
        ('flat', 'Flat'),
        ('house', 'Full House'),
    )
    FURNISHING_STATUS_CHOICES = (
        ('furnished', 'Furnished'),
        ('unfurnished', 'Unfurnished'),
        ('semi_furnished', 'Semi Furnished'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    landlord = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='properties',
        limit_choices_to={'role': 'landlord'},
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    district = models.CharField(max_length=100)
    address = models.TextField()
    room_type = models.CharField(max_length=30, choices=ROOM_TYPE_CHOICES)
    furnishing_status = models.CharField(max_length=30, choices=FURNISHING_STATUS_CHOICES)
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Properties'

    def __str__(self):
        return f"{self.title} — {self.district} ({self.room_type})"


class PropertyPhoto(models.Model):
    """Store a photo belonging to a property listing."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='photos')
    photo_url = models.CharField(max_length=500)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order']

    def __str__(self):
        return f"Photo for {self.property.title} (order {self.sort_order})"


class SavedProperty(models.Model):
    """Track properties saved by tenants."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_properties',
        limit_choices_to={'role': 'tenant'},
    )
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='saved_by')
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tenant', 'property')
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.tenant.email} saved {self.property.title}"
