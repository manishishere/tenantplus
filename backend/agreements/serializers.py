from rest_framework import serializers

from applications.serializers import PropertySummarySerializer, TenantSummarySerializer

from .models import Agreement


class AgreementListSerializer(serializers.ModelSerializer):
    """Read-only serializer for agreement listings."""

    property = PropertySummarySerializer(read_only=True)
    tenant = TenantSummarySerializer(read_only=True)

    class Meta:
        model = Agreement
        fields = ('id', 'property', 'tenant', 'status', 'rent_amount', 'start_date', 'end_date', 'created_at')


class AgreementDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for agreement details."""

    property = PropertySummarySerializer(read_only=True)
    tenant = TenantSummarySerializer(read_only=True)
    landlord = TenantSummarySerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()
    proposed_rent_increase = serializers.SerializerMethodField()

    class Meta:
        model = Agreement
        fields = (
            'id',
            'property',
            'tenant',
            'landlord',
            'status',
            'rent_amount',
            'start_date',
            'end_date',
            'tenant_acknowledged',
            'landlord_acknowledged',
            'created_at',
            'updated_at',
            'is_expired',
            'proposed_rent_increase',
        )

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_proposed_rent_increase(self, obj):
        return obj.proposed_rent_increase()


class AgreementAcknowledgeSerializer(serializers.Serializer):
    """Empty serializer used to trigger acknowledgment actions."""


class AgreementTerminateSerializer(serializers.Serializer):
    """Writable serializer for agreement termination requests."""

    termination_reason = serializers.CharField()