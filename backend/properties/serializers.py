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
    landlord_is_verified = serializers.SerializerMethodField()
    first_photo = serializers.SerializerMethodField()
    fuzzy_address = serializers.ReadOnlyField()

    class Meta:
        model = Property
        fields = (
            'id',
            'title',
            'province',
            'district',
            'municipality',
            'ward_no',
            'tole',
            'fuzzy_address',
            'room_type',
            'furnishing_status',
            'rent_amount',
            'is_available',
            'verification_status',
            'created_at',
            'photo_count',
            'landlord_name',
            'landlord_is_verified',
            'first_photo',
        )

    def get_photo_count(self, obj):
        return obj.photos.count()

    def get_landlord_name(self, obj):
        return obj.landlord.full_name

    def get_landlord_is_verified(self, obj):
        return obj.landlord.is_verified

    def get_first_photo(self, obj):
        photo = obj.photos.first()
        return photo.photo_url if photo else None


class PropertyDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for full property detail responses."""

    photos = PropertyPhotoSerializer(many=True, read_only=True)
    landlord_name = serializers.SerializerMethodField()
    landlord_email = serializers.SerializerMethodField()
    landlord_phone = serializers.SerializerMethodField()
    landlord_is_verified = serializers.SerializerMethodField()
    photo_count = serializers.SerializerMethodField()

    # Admin/Landlord restricted document URLs
    lalpurja_doc_url = serializers.SerializerMethodField()
    electricity_bill_url = serializers.SerializerMethodField()

    # Privacy-controlled address fields
    display_address = serializers.SerializerMethodField()
    address_is_full = serializers.SerializerMethodField()
    fuzzy_address = serializers.ReadOnlyField()

    class Meta:
        model = Property
        fields = (
            'id',
            'title',
            'description',
            'province',
            'district',
            'municipality',
            'ward_no',
            'tole',
            'landmark',
            'fuzzy_address',
            'display_address',
            'address_is_full',
            'room_type',
            'furnishing_status',
            'rent_amount',
            'is_available',
            'verification_status',
            'lalpurja_doc_url',
            'electricity_bill_url',
            'created_at',
            'updated_at',
            'photos',
            'landlord_name',
            'landlord_email',
            'landlord_phone',
            'landlord_is_verified',
            'photo_count',
        )

    def _can_see_full_address(self, obj):
        """Return True if the requesting user is allowed to see the full address."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        user = request.user
        if user == obj.landlord or user.role == 'admin':
            return True
        # Reveal if tenant has accepted application or active agreement
        has_accepted_app = obj.applications.filter(tenant=user, status='accepted').exists()
        has_agreement = obj.agreements.filter(tenant=user).exists()
        return has_accepted_app or has_agreement

    def get_display_address(self, obj):
        if self._can_see_full_address(obj):
            return obj.full_address
        return obj.fuzzy_address

    def get_address_is_full(self, obj):
        return self._can_see_full_address(obj)

    def get_lalpurja_doc_url(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user == obj.landlord or request.user.role == 'admin':
                return obj.lalpurja_doc_url
        return None  # Hidden from tenants for privacy & security

    def get_electricity_bill_url(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user == obj.landlord or request.user.role == 'admin':
                return obj.electricity_bill_url
        return None  # Hidden from tenants for privacy & security

    def get_landlord_name(self, obj):
        return obj.landlord.full_name

    def get_landlord_email(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return "🔒 Contact Protected"
        user = request.user
        if user == obj.landlord or user.role == 'admin':
            return obj.landlord.email
        has_app = obj.applications.filter(tenant=user, status__in=['pending', 'accepted']).exists()
        has_agreement = obj.agreements.filter(tenant=user).exists()
        if has_app or has_agreement:
            return obj.landlord.email
        return "🔒 Contact Protected"

    def get_landlord_phone(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return "🔒 Protected (Apply to Reveal)"
        user = request.user
        if user == obj.landlord or user.role == 'admin':
            return obj.landlord.phone or "+977 9801234567"
        has_app = obj.applications.filter(tenant=user, status__in=['pending', 'accepted']).exists()
        has_agreement = obj.agreements.filter(tenant=user).exists()
        if has_app or has_agreement:
            return obj.landlord.phone or "+977 9801234567"
        return "🔒 Protected (Apply to Reveal)"

    def get_landlord_is_verified(self, obj):
        return obj.landlord.is_verified

    def get_photo_count(self, obj):
        return obj.photos.count()


class PropertyCreateUpdateSerializer(serializers.ModelSerializer):
    """Writable serializer for creating and updating property listings."""

    landlord = serializers.PrimaryKeyRelatedField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)

    province = serializers.CharField(required=False, allow_blank=True, default='')
    district = serializers.CharField(required=True)
    municipality = serializers.CharField(required=False, allow_blank=True, default='')
    ward_no = serializers.CharField(required=False, allow_blank=True, default='')
    tole = serializers.CharField(required=False, allow_blank=True, default='')
    landmark = serializers.CharField(required=False, allow_blank=True, default='')
    address = serializers.CharField(required=False, allow_blank=True, default='')
    lalpurja_doc_url = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    electricity_bill_url = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    verification_status = serializers.CharField(required=False, default='verified')

    class Meta:
        model = Property
        fields = (
            'title',
            'description',
            'province',
            'district',
            'municipality',
            'ward_no',
            'tole',
            'landmark',
            'address',
            'room_type',
            'furnishing_status',
            'rent_amount',
            'lalpurja_doc_url',
            'electricity_bill_url',
            'verification_status',
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

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user and not user.is_verified:
            raise serializers.ValidationError('KYC Verification Required: You must complete identity verification under Settings before creating property listings.')
        return attrs

    def create(self, validated_data):
        if not validated_data.get('address'):
            parts = []
            if validated_data.get('landmark'):
                parts.append(validated_data['landmark'])
            if validated_data.get('tole'):
                parts.append(validated_data['tole'])
            if validated_data.get('ward_no'):
                parts.append(f"Ward {validated_data['ward_no']}")
            if validated_data.get('municipality'):
                parts.append(validated_data['municipality'])
            if validated_data.get('district'):
                parts.append(validated_data['district'])
            if validated_data.get('province'):
                parts.append(validated_data['province'])
            validated_data['address'] = ', '.join(parts)
        return super().create(validated_data)



class SavedPropertySerializer(serializers.ModelSerializer):
    """Serialize saved-property relationships for tenants."""

    property = PropertyListSerializer(read_only=True)
    tenant = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = SavedProperty
        fields = ('id', 'property', 'tenant', 'created_at')
