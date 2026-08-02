from rest_framework import serializers

from agreements.models import Agreement
from properties.models import Property

from .models import MaintenanceImage, MaintenanceRequest


class PropertySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ('id', 'title', 'address', 'landlord')


class MaintenanceImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceImage
        fields = ('id', 'image', 'uploaded_at')

    def get_image(self, obj):
        if not obj.image:
            return None
        url = obj.image.url
        if not url.startswith('/media/'):
            url = f"/media/{url.lstrip('/')}"
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(url)
        return f"http://localhost:8000{url}"


class MaintenanceRequestListSerializer(serializers.ModelSerializer):
    property = PropertySummarySerializer(read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = ('id', 'ticket_no', 'property', 'title', 'priority', 'status', 'created_at')


class MaintenanceRequestDetailSerializer(serializers.ModelSerializer):
    images = MaintenanceImageSerializer(many=True, read_only=True)
    history_trail = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRequest
        fields = (
            'id',
            'property',
            'tenant',
            'title',
            'description',
            'priority',
            'status',
            'ticket_no',
            'created_at',
            'updated_at',
            'images',
            'history_trail',
        )

    def get_history_trail(self, obj):
        trail = []
        try:
            for h in obj.history.all().order_by('history_date'):
                trail.append({
                    'status': h.status,
                    'priority': h.priority,
                    'changed_by': h.history_user.full_name if (h.history_user and hasattr(h.history_user, 'full_name')) else 'System',
                    'timestamp': h.history_date.isoformat(),
                    'change_type': h.history_type,
                })
        except Exception:
            pass
        return trail


class MaintenanceRequestCreateSerializer(serializers.ModelSerializer):
    property = serializers.PrimaryKeyRelatedField(queryset=Property.objects.select_related('landlord'))
    priority = serializers.ChoiceField(choices=MaintenanceRequest.PRIORITY_CHOICES, required=False, default=MaintenanceRequest.PRIORITY_MEDIUM)

    class Meta:
        model = MaintenanceRequest
        fields = ('property', 'title', 'description', 'priority')

    def validate_property(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not Agreement.objects.filter(
            tenant=user,
            property=value,
            status=Agreement.STATUS_ACTIVE,
        ).exists():
            raise serializers.ValidationError(
                'You can only file maintenance requests for properties you currently rent under an active lease agreement.'
            )
        return value


class MaintenanceStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=MaintenanceRequest.STATUS_CHOICES, required=False)
    priority = serializers.ChoiceField(choices=MaintenanceRequest.PRIORITY_CHOICES, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('At least one field must be provided.')
        return attrs


class MaintenanceRequestUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, max_length=150)
    description = serializers.CharField(required=False)
    priority = serializers.ChoiceField(choices=MaintenanceRequest.PRIORITY_CHOICES, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('At least one field must be provided.')
        return attrs
