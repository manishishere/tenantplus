from rest_framework import serializers

from .models import Property, PropertyPhoto, SavedProperty


class PropertyPhotoSerializer(serializers.ModelSerializer):
    """Serialize property photos for read and write operations."""

    class Meta:
        model = PropertyPhoto
        fields = ('id', 'property', 'photo_url', 'sort_order', 'created_at')
        read_only_fields = ('property',)


class PropertyListSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing property summaries."""

    photo_count = serializers.SerializerMethodField()
    landlord_name = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = (
            'id',
            'title',
            'district',
            'room_type',
            'furnishing_status',
            'rent_amount',
            'is_available',
            'created_at',
            'photo_count',
            'landlord_name',
        )

    def get_photo_count(self, obj):
        return obj.photos.count()

    def get_landlord_name(self, obj):
        return obj.landlord.full_name


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for full property detail responses."""

    photos = PropertyPhotoSerializer(many=True, read_only=True)
    landlord_name = serializers.SerializerMethodField()
    landlord_email = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = (
            'id',
            'title',
            'description',
            'district',
            'address',
            'room_type',
            'furnishing_status',
            'rent_amount',
            'is_available',
            'created_at',
            'updated_at',
            'photos',
            'landlord_name',
            'landlord_email',
            'photo_count',
        )

    def get_landlord_name(self, obj):
        return obj.landlord.full_name

    def get_landlord_email(self, obj):
        return obj.landlord.email

    def get_photo_count(self, obj):
        return obj.photos.count()


class PropertyCreateUpdateSerializer(serializers.ModelSerializer):
    """Writable serializer for creating and updating property listings."""

    landlord = serializers.PrimaryKeyRelatedField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = Property
        fields = (
            'title',
            'description',
            'district',
            'address',
            'room_type',
            'furnishing_status',
            'rent_amount',
            'landlord',
            'is_available',
        )

    def validate_rent_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Rent amount must be greater than zero.')
        return value

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError('Title must be at least 5 characters long.')
        return value


class SavedPropertySerializer(serializers.ModelSerializer):
    """Serialize saved-property relationships for tenants."""

    property = PropertyListSerializer(read_only=True)
    tenant = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SavedProperty
        fields = ('id', 'property', 'tenant', 'saved_at')
