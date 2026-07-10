from datetime import date

from rest_framework import serializers

from agreements.models import Agreement

from .models import EsewaPaymentLog, RentPayment


class AgreementSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agreement
        fields = ('id', 'rent_amount', 'start_date', 'end_date', 'status')


class RentPaymentListSerializer(serializers.ModelSerializer):
    agreement = AgreementSummarySerializer(read_only=True)

    class Meta:
        model = RentPayment
        fields = ('id', 'agreement', 'amount', 'payment_month', 'paid_at', 'receipt_no', 'is_late', 'late_fee')


class RentPaymentDetailSerializer(serializers.ModelSerializer):
    agreement = AgreementSummarySerializer(read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = RentPayment
        fields = (
            'id',
            'agreement',
            'amount',
            'payment_month',
            'paid_at',
            'receipt_no',
            'is_late',
            'late_fee',
            'notes',
            'created_at',
            'total_amount',
        )

    def get_total_amount(self, obj):
        return obj.amount + obj.late_fee


class RentPaymentCreateSerializer(serializers.ModelSerializer):
    agreement = serializers.PrimaryKeyRelatedField(queryset=Agreement.objects.select_related('tenant', 'landlord', 'property'))

    class Meta:
        model = RentPayment
        fields = ('agreement', 'payment_month', 'amount', 'notes')

    def validate_agreement(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user != value.tenant:
            raise serializers.ValidationError('You can only record payments for your own agreements.')
        if value.status != Agreement.STATUS_ACTIVE:
            raise serializers.ValidationError('This agreement is not active.')
        return value

    def validate_payment_month(self, value):
        normalized_value = value.replace(day=1)
        if normalized_value > date.today().replace(day=1):
            raise serializers.ValidationError('Cannot record payment for a future month.')
        return normalized_value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be greater than zero.')
        return value

    def validate(self, attrs):
        agreement = attrs.get('agreement')
        payment_month = attrs.get('payment_month')
        if agreement and payment_month and RentPayment.objects.filter(agreement=agreement, payment_month=payment_month).exists():
            raise serializers.ValidationError('A payment has already been recorded for this month.')
        return attrs


class EsewaInitiateSerializer(serializers.ModelSerializer):
    payment = serializers.PrimaryKeyRelatedField(queryset=RentPayment.objects.select_related('agreement', 'agreement__tenant'))

    class Meta:
        model = EsewaPaymentLog
        fields = ('payment',)

    def validate_payment(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user != value.agreement.tenant:
            raise serializers.ValidationError('You can only initiate payments for your own agreements.')
        if value.esewa_logs.filter(status=EsewaPaymentLog.STATUS_COMPLETE).exists():
            raise serializers.ValidationError('This payment already has a completed eSewa log.')
        return value


class EsewaCallbackSerializer(serializers.Serializer):
    data = serializers.CharField()
