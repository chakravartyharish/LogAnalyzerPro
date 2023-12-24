import base64
import binascii

from rest_framework import serializers

from backend.constants import USERMESSAGE_GROUPS_CHANGED_TITLE
from backend.license_utils import decode_and_verify_license_blob
from backend.decorators import set_groups_on_created_model_instance_decorator
from .models import HWInterface, SystemData, UserMessage, BackendEvent, License, UserData, User, UserManager, UserGroup


class HWInterfaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HWInterface
        fields = ('id', 'name', 'category', 'subtype', 'created_at', 'state', 'config',
                  'current_device_path', 'extended_state')
        read_only_fields = ('id', 'name', 'category', 'subtype', 'created_at', 'state')


class UserMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserMessage
        fields = ('id', 'title', 'message', 'created_at', 'state')
        read_only_fields = ('id', 'title', 'message', 'created_at')

    @set_groups_on_created_model_instance_decorator
    def create(self, validated_data):
        return super(UserMessageSerializer, self).create(validated_data)


class BackendEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackendEvent
        fields = ('id', 'unique_identifier', 'level', 'type', 'template', 'extras', 'timestamp')
        read_only_fields = ('id', 'unique_identifier')

    @set_groups_on_created_model_instance_decorator
    def create(self, validated_data):
        return super(BackendEventSerializer, self).create(validated_data)


class LicenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = ('id', 'license_text', 'license_config', 'disabled')
        read_only_fields = ['id', 'disabled']

    @set_groups_on_created_model_instance_decorator
    def create(self, validated_data):
        try:
            raw_license, raw_signature = validated_data["license_text"].split(":")
            base64.b64decode(raw_license).decode("utf-8")
            base64.b64decode(raw_signature)
            if decode_and_verify_license_blob(validated_data["license_text"])["HWID"] != \
                    SystemData.objects.first().hardware_id:
                raise serializers.ValidationError("License is not valid for this machine")
        except (binascii.Error, UnicodeDecodeError, ValueError):
            raise serializers.ValidationError("License does not seem to be correct or in a correct format")
        except Exception as e:
            if str(e) == "Invalid Signature":
                raise serializers.ValidationError("License does not seem to be correct or in a correct format")
            else:
                raise e

        # No duplicate license should be possible
        if License.objects.filter(license_text=validated_data["license_text"]):
            raise serializers.ValidationError("License is already enabled.")

        license = License(
            license_text=validated_data["license_text"]
        )
        license.save()
        return license


class SystemDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemData
        fields = ('influxdb_env', 'hardware_id', 'backend_version', 'app_environment', 'license_request',
                  'product_personality_name', 'remote_testcases_dict')
        read_only_fields = ['influxdb_env', 'hardware_id', 'backend_version', 'app_environment', 'license_request',
                            'product_personality_name', 'remote_testcases_dict']


class UserDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserData
        fields = ('id', 'user_data', 'created_at', 'updated_at')
        read_only_fields = ['id', 'created_at', 'updated_at']

    @set_groups_on_created_model_instance_decorator
    def create(self, validated_data):
        return super(UserDataSerializer, self).create(validated_data)


class UserSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(queryset=UserGroup.objects.all(), many=True, allow_null=True)
    authenticated_user_password = serializers.CharField(style={'input_type': 'password'}, trim_whitespace=False,
                                                        write_only=True, allow_blank=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'is_active', 'is_admin', 'is_staff', 'creation_date', 'name', 'company', 'password',
                  'last_login', 'groups', 'authenticated_user_password')
        read_only_fields = ['id', 'is_active', 'is_admin', 'creation_date', 'last_login']

    def update(self, instance, validated_data):
        authenticated_user = self.context['scope']['user']

        is_admin_or_staff = (authenticated_user.is_admin or authenticated_user.is_staff)

        if not (is_admin_or_staff or authenticated_user.email == instance.email):
            # TODO: not really a validation error
            raise serializers.ValidationError('Insufficient permissions')

        # TODO: rethink this handling

        # No need for authenticated user password if we only change the group
        groups = validated_data.get('groups')
        if groups:
            # FIXME
            if is_admin_or_staff:
                # only allow staff or admins to change groups
                instance.groups.set(groups)
                UserMessage.objects.get_or_create(user=instance,
                                                  title=USERMESSAGE_GROUPS_CHANGED_TITLE,
                                                  message='Your assigned groups changed. '
                                                          'For this to take effect you have been forcefully logged out.',
                                                  state=UserMessage.State.CREATED)
        else:
            if not authenticated_user.check_password(validated_data.get('authenticated_user_password', '')):
                raise serializers.ValidationError('The authenticated_user_password is invalid')

            if is_admin_or_staff:
                # allow only staff / admin to change the name and / or email
                new_name = validated_data.get('name')
                if new_name:
                    instance.name = new_name

                new_email = validated_data.get('email')
                if new_email:
                    instance.email = new_email

            # always allow a user to change his/her password
            new_password = validated_data.get('password')
            if new_password:
                instance.set_password(new_password)

        instance.save()
        return instance

    def create(self, validated_data):
        user = super(UserSerializer, self).create(validated_data)
        user.set_password(validated_data.get('password'))
        user.save()
        UserManager.create_and_attach_user_data_object_if_necessary(user)
        return user


class UserGroupSerializer(serializers.ModelSerializer):
    users = UserSerializer(required=False, many=True)

    class Meta:
        model = UserGroup
        fields = ('id', 'name', 'description', 'creation_date', 'users')
        read_only_fields = ['id', 'creation_date']

    @staticmethod
    def _update_user_group(instance, validated_data):
        users = validated_data.pop('users', [])
        user_model_objects = []
        for user in users:
            user_model_objects.append(User.objects.get(pk=user))

        instance.users.set(user_model_objects)
        return instance

    def create(self, validated_data):
        instance = UserGroup.objects.create(**validated_data)
        return self._update_user_group(instance, validated_data)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        return self._update_user_group(instance, validated_data)
