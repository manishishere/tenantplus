from rest_framework import serializers
from .models import UtilityBill, UtilityMeterReading
from agreements.serializers import AgreementListSerializer

class UtilityMeterReadingSerializer(serializers.ModelSerializer):
    utility_type_display = serializers.CharField(source='get_utility_type_display', read_only=True)
    
    class Meta:
        model = UtilityMeterReading
        fields = [
            'id', 'agreement', 'bill', 'utility_type', 'utility_type_display',
            'previous_reading', 'current_reading', 'reading_date', 'image_proof',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class UtilityBillSerializer(serializers.ModelSerializer):
    readings = UtilityMeterReadingSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    agreement_detail = AgreementListSerializer(source='agreement', read_only=True)

    class Meta:
        model = UtilityBill
        fields = [
            'id', 'agreement', 'agreement_detail', 'billing_month', 'total_amount', 'due_date',
            'status', 'status_display', 'readings', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
