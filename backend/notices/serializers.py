from rest_framework import serializers

from accounts.models import User
from agreements.models import Agreement

from .models import Notice


class AgreementSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agreement
        fields = ('id', 'rent_amount', 'start_date', 'end_date', 'status')


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'role')


class NoticeListSerializer(serializers.ModelSerializer):
    agreement = AgreementSummarySerializer(read_only=True)
    issued_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = Notice
        fields = (
            'id',
            'agreement',
            'issued_by',
            'notice_type',
            'notice_no',
            'subject',
            'effective_date',
            'is_acknowledged',
            'created_at',
        )


class NoticeDetailSerializer(serializers.ModelSerializer):
    agreement = AgreementSummarySerializer(read_only=True)
    issued_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = Notice
        fields = (
            'id',
            'agreement',
            'issued_by',
            'notice_type',
            'notice_no',
            'subject',
            'body',
            'notice_period_days',
            'effective_date',
            'is_acknowledged',
            'acknowledged_at',
            'created_at',
            'updated_at',
        )


class NoticeCreateSerializer(serializers.ModelSerializer):
    agreement = serializers.PrimaryKeyRelatedField(queryset=Agreement.objects.select_related('tenant', 'landlord', 'property'))
    notice_type = serializers.ChoiceField(choices=Notice.NOTICE_TYPE_CHOICES)
    notice_period_days = serializers.IntegerField(required=False, default=30, min_value=1)

    class Meta:
        model = Notice
        fields = ('agreement', 'notice_type', 'subject', 'body', 'notice_period_days')

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        agreement = attrs.get('agreement')
        notice_type = attrs.get('notice_type')

        if agreement.status != Agreement.STATUS_ACTIVE:
            raise serializers.ValidationError('Cannot issue a notice for an inactive agreement.')

        if notice_type == Notice.NOTICE_EVICTION:
            if user != agreement.landlord:
                raise serializers.ValidationError('Only landlords can issue eviction notices.')

        if notice_type == Notice.NOTICE_RENT_ARREARS:
            if user != agreement.landlord:
                raise serializers.ValidationError('Only landlords can issue rent arrears warnings.')

        if notice_type in (Notice.NOTICE_TERMINATION, Notice.NOTICE_GENERAL):
            if user != agreement.tenant and user != agreement.landlord:
                raise serializers.ValidationError('You are not a party to this agreement.')

        return attrs


class NoticeAcknowledgeSerializer(serializers.Serializer):
    pass