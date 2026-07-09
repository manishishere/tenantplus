import uuid
from datetime import date

from django.db import models


class MaintenanceRequest(models.Model):
    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_EMERGENCY = 'emergency'

    PRIORITY_CHOICES = (
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_EMERGENCY, 'Emergency'),
    )

    STATUS_PENDING = 'pending'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_RESOLVED = 'resolved'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_RESOLVED, 'Resolved'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, related_name='maintenance_requests')
    tenant = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='submitted_maintenance')
    title = models.CharField(max_length=150)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    ticket_no = models.CharField(max_length=50, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket_no} — {self.title[:20]} ({self.status})"

    def generate_ticket_no(self):
        today = date.today()
        count = MaintenanceRequest.objects.filter(
            created_at__year=today.year,
            created_at__month=today.month,
        ).count()
        return f"MN-{today.strftime('%Y%m')}-{count + 1:04d}"

    def save(self, *args, **kwargs):
        if not self.ticket_no:
            self.ticket_no = self.generate_ticket_no()
        super().save(*args, **kwargs)


class MaintenanceImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(MaintenanceRequest, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='maintenance_issues/%Y/%m/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
