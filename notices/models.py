import uuid
from datetime import date

from django.conf import settings
from django.db import models


class Notice(models.Model):
    NOTICE_TERMINATION = 'termination'
    NOTICE_EVICTION = 'eviction'
    NOTICE_RENT_ARREARS = 'rent_arrears'
    NOTICE_GENERAL = 'general'

    NOTICE_TYPE_CHOICES = (
        (NOTICE_TERMINATION, 'Termination Notice'),
        (NOTICE_EVICTION, 'Eviction Notice'),
        (NOTICE_RENT_ARREARS, 'Rent Arrears Warning'),
        (NOTICE_GENERAL, 'General Notice'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey('agreements.Agreement', on_delete=models.CASCADE, related_name='notices')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issued_notices',
    )
    notice_type = models.CharField(max_length=30, choices=NOTICE_TYPE_CHOICES)
    notice_no = models.CharField(max_length=50, unique=True, blank=True)
    subject = models.CharField(max_length=255)
    body = models.TextField()
    notice_period_days = models.PositiveIntegerField(default=30)
    effective_date = models.DateField()
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notice_no} — {self.notice_type} — {self.agreement.property.title[:20]}"

    def generate_notice_no(self):
        today = date.today()
        count = Notice.objects.filter(created_at__year=today.year, created_at__month=today.month).count()
        return f"NT-{today.strftime('%Y%m')}-{count + 1:04d}"

    def save(self, *args, **kwargs):
        if not self.notice_no:
            self.notice_no = self.generate_notice_no()
        super().save(*args, **kwargs)
