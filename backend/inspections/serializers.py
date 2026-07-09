from rest_framework import serializers

from agreements.models import Agreement
from properties.models import Property

from .models import MoveOutInspection


class PropertySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ('id', 'title', 'address', 'landlord')


class InspectionListSerializer(serializers.ModelSerializer):
    agreement = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = MoveOutInspection
        fields = ('id', 'agreement', 'inspection_date', 'structural_condition', 'is_finalized', 'report_no')


class InspectionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoveOutInspection
        fields = (
            'id',
            'agreement',
            'inspector',
            'inspection_date',
            'structural_condition',
            'utility_status',
            'total_deductions',
            'deduction_reason',
            'refund_amount_calculated',
            'is_finalized',
            'report_no',
            'created_at',
        )


class InspectionCreateSerializer(serializers.ModelSerializer):
    agreement = serializers.PrimaryKeyRelatedField(queryset=Agreement.objects.select_related('tenant', 'landlord', 'property'))

    class Meta:
        model = MoveOutInspection
        fields = ('agreement', 'inspection_date', 'structural_condition', 'utility_status', 'total_deductions', 'deduction_reason')

    def validate_agreement(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if value.status not in {Agreement.STATUS_ACTIVE, Agreement.STATUS_EXPIRED}:
            raise serializers.ValidationError('You cannot file an inspection report against an already terminated agreement.')
        if not (user == value.landlord or getattr(user, 'role', None) == 'admin'):
            raise serializers.ValidationError('Only landlords or admins can log inspection reports.')
        return value


class InspectionFinalizeSerializer(serializers.Serializer):
    is_finalized = serializers.BooleanField()

    def validate_is_finalized(self, value):
        if value is not True:
            raise serializers.ValidationError('is_finalized must be true.')
        return value


class InspectionUpdateSerializer(serializers.Serializer):
    inspection_date = serializers.DateField(required=False)
    structural_condition = serializers.ChoiceField(choices=MoveOutInspection.STRUCTURAL_CHOICES, required=False)
    utility_status = serializers.ChoiceField(choices=MoveOutInspection.UTILITY_CHOICES, required=False)
    total_deductions = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    deduction_reason = serializers.CharField(required=False, allow_blank=True)
    is_finalized = serializers.BooleanField(required=False)

    def validate_is_finalized(self, value):
        if value is not True:
            raise serializers.ValidationError('is_finalized must be true.')
        return value

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('At least one field must be provided.')
        return attrs
