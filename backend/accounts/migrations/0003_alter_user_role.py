from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_user_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(choices=[('tenant', 'Tenant'), ('landlord', 'Landlord'), ('admin', 'Admin')], default='tenant', max_length=20),
        ),
    ]