from rest_framework import serializers

from properties.models import Property

from .models import Application


class PropertySummarySerializer(serializers.ModelSerializer):
    """Read-only summary for property references."""

    class Meta:
        model = Property
        fields = ('id', 'title', 'district', 'rent_amount')


class TenantSummarySerializer(serializers.Serializer):
    """Read-only summary for tenant references."""

    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class ApplicationListSerializer(serializers.ModelSerializer):
    """Read-only serializer for application listings."""

    property = PropertySummarySerializer(read_only=True)
    tenant = TenantSummarySerializer(read_only=True)

    class Meta:
        model = Application
        fields = ('id', 'property', 'tenant', 'status', 'created_at')


class ApplicationDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for full application details."""

    property = PropertySummarySerializer(read_only=True)
    tenant = TenantSummarySerializer(read_only=True)

    class Meta:
        model = Application
        fields = ('id', 'property', 'tenant', 'status', 'message', 'created_at', 'updated_at')


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Writable serializer for new applications."""

    property = serializers.PrimaryKeyRelatedField(queryset=Property.objects.all())

    class Meta:
        model = Application
        fields = ('property', 'message')

    def validate_property(self, value):
        if not value.is_available:
            raise serializers.ValidationError('This property is not available.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        tenant = getattr(request, 'user', None)
        property_obj = attrs.get('property')
        if tenant and property_obj:
            if Application.objects.filter(
                tenant=tenant,
                property=property_obj,
                status__in=(Application.STATUS_PENDING, Application.STATUS_ACCEPTED),
            ).exists():
                raise serializers.ValidationError('You already have an active application for this property.')
        return attrs


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    """Writable serializer for landlord status updates."""

    status = serializers.ChoiceField(choices=(('accepted', 'Accepted'), ('rejected', 'Rejected')))