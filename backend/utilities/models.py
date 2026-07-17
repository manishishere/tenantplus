import uuid
from django.db import models

class UtilityBill(models.Model):
    STATUS_UNPAID = 'unpaid'
    STATUS_PAID = 'paid'
    STATUS_OVERDUE = 'overdue'

    STATUS_CHOICES = (
        (STATUS_UNPAID, 'Unpaid'),
        (STATUS_PAID, 'Paid'),
        (STATUS_OVERDUE, 'Overdue'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey('agreements.Agreement', on_delete=models.CASCADE, related_name='utility_bills')
    billing_month = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNPAID)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date']

    def __str__(self):
        return f"Bill for {self.agreement.property.title} - {self.billing_month.strftime('%Y-%m')}"


class UtilityMeterReading(models.Model):
    UTILITY_WATER = 'water'
    UTILITY_ELECTRICITY = 'electricity'
    UTILITY_INTERNET = 'internet'
    UTILITY_GARBAGE = 'garbage'

    UTILITY_CHOICES = (
        (UTILITY_WATER, 'Water'),
        (UTILITY_ELECTRICITY, 'Electricity'),
        (UTILITY_INTERNET, 'Internet'),
        (UTILITY_GARBAGE, 'Garbage'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey('agreements.Agreement', on_delete=models.CASCADE, related_name='meter_readings')
    bill = models.ForeignKey(UtilityBill, on_delete=models.SET_NULL, null=True, blank=True, related_name='readings')
    utility_type = models.CharField(max_length=20, choices=UTILITY_CHOICES)
    previous_reading = models.DecimalField(max_digits=10, decimal_places=2)
    current_reading = models.DecimalField(max_digits=10, decimal_places=2)
    reading_date = models.DateField()
    image_proof = models.ImageField(upload_to='utilities/proofs/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-reading_date']

    def __str__(self):
        return f"{self.get_utility_type_display()} Reading - {self.reading_date}"
