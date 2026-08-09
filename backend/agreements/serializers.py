from rest_framework import serializers

from applications.serializers import PropertySummarySerializer, TenantSummarySerializer

from .models import Agreement


class AgreementListSerializer(serializers.ModelSerializer):
    """Read-only serializer for agreement listings."""

    property = PropertySummarySerializer(read_only=True)
    tenant = TenantSummarySerializer(read_only=True)
    landlord = serializers.SerializerMethodField()

    def get_landlord(self, obj):
        l_user = obj.landlord or getattr(obj.property, 'landlord', None)
        if l_user:
            return TenantSummarySerializer(l_user).data
        return None

    renewal_proposed_by = serializers.SerializerMethodField()

    def get_renewal_proposed_by(self, obj):
        if obj.renewal_proposed_by:
            return TenantSummarySerializer(obj.renewal_proposed_by).data
        return None

    class Meta:
        model = Agreement
        fields = (
            'id', 
            'property', 
            'tenant', 
            'landlord',
            'status', 
            'rent_amount',
            'advance_amount',
            'advance_payment_status',
            'advance_payment_deadline',
            'start_date', 
            'end_date', 
            'tenant_acknowledged', 
            'landlord_acknowledged', 
            'signed_document_url', 
            'landlord_signature_url',
            'tenant_signature_url',
            'witness1_name',
            'witness1_citizenship',
            'witness1_phone',
            'witness2_name',
            'witness2_citizenship',
            'witness2_phone',
            'signed_doc_status', 
            'rejection_reason', 
            'renewal_status',
            'renewal_proposed_by',
            'renewal_proposed_rent',
            'renewal_increase_percent',
            'created_at'
        )


class AgreementDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for agreement details."""

    property = PropertySummarySerializer(read_only=True)
    tenant = TenantSummarySerializer(read_only=True)
    landlord = TenantSummarySerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()
    proposed_rent_increase = serializers.SerializerMethodField()
    renewal_proposed_by = serializers.SerializerMethodField()

    class Meta:
        model = Agreement
        fields = (
            'id',
            'property',
            'tenant',
            'landlord',
            'status',
            'rent_amount',
            'advance_amount',
            'advance_payment_status',
            'advance_payment_deadline',
            'start_date',
            'end_date',
            'tenant_acknowledged',
            'landlord_acknowledged',
            'signed_document_url',
            'landlord_signature_url',
            'tenant_signature_url',
            'witness1_name',
            'witness1_citizenship',
            'witness1_phone',
            'witness2_name',
            'witness2_citizenship',
            'witness2_phone',
            'signed_doc_status',
            'rejection_reason',
            'renewal_status',
            'renewal_proposed_by',
            'renewal_proposed_rent',
            'renewal_increase_percent',
            'created_at',
            'updated_at',
            'is_expired',
            'proposed_rent_increase',
        )

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_proposed_rent_increase(self, obj):
        return obj.proposed_rent_increase()

    def get_renewal_proposed_by(self, obj):
        if obj.renewal_proposed_by:
            return TenantSummarySerializer(obj.renewal_proposed_by).data
        return None


class AgreementAcknowledgeSerializer(serializers.Serializer):
    """Empty serializer used to trigger acknowledgment actions."""


class AgreementTerminateSerializer(serializers.Serializer):
    """Writable serializer for agreement termination requests."""

    termination_reason = serializers.CharField()