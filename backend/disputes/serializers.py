from rest_framework import serializers

from accounts.models import User
from agreements.models import Agreement

from .models import Dispute


class DisputeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = (
            'id',
            'agreement',
            'filed_by',
            'dispute_type',
            'subject',
            'description',
            'dispute_no',
            'status',
            'admin_notes',
            'resolved_at',
            'created_at',
            'updated_at',
        )


class DisputeCreateSerializer(serializers.ModelSerializer):
    agreement = serializers.PrimaryKeyRelatedField(queryset=Agreement.objects.select_related('tenant', 'landlord'), required=False, allow_null=True)
    subject = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Dispute
        fields = ('agreement', 'dispute_type', 'subject', 'title', 'description')

    def validate(self, attrs):
        if 'title' in attrs and not attrs.get('subject'):
            attrs['subject'] = attrs.pop('title')
        if not attrs.get('subject'):
            attrs['subject'] = 'General Rental Dispute'
        return attrs

    def validate_agreement(self, value):
        if not value:
            return value
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user != value.tenant and user != value.landlord:
            raise serializers.ValidationError('You are not a party to this agreement.')
        return value


class DisputeResolveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=(Dispute.STATUS_RESOLVED, Dispute.STATUS_DISMISSED))
    admin_notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('At least one field must be provided.')
        return attrs