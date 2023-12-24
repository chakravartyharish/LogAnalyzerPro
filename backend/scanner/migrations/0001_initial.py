# Generated by Django 4.0.4 on 2023-03-31 12:45

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import scanner.validators


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ISOTPEndpoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hw_interface', models.CharField(default='Unknown', max_length=100)),
                ('name', models.CharField(default='Endpoint', max_length=100)),
                ('rx_id', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(536870911)])),
                ('tx_id', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(536870911)])),
                ('ext_address', models.IntegerField(blank=True, default=None, null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(255)])),
                ('rx_ext_address', models.IntegerField(blank=True, default=None, null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(255)])),
                ('padding', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='ISOTPEndpointScannerConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('remote_scan_selected_channel', models.CharField(blank=True, max_length=50, null=True)),
                ('scan_range', models.CharField(default='0-0x7ff', max_length=100, validators=[scanner.validators.validate_scan_range])),
                ('extended_addressing', models.BooleanField(default=False)),
                ('extended_scan_range', models.CharField(default='0x00-0xff', max_length=100, validators=[scanner.validators.validate_extended_scan_range])),
                ('noise_listen_time', models.IntegerField(default=2, validators=[django.core.validators.MinValueValidator(0)])),
                ('sniff_time', models.FloatField(default=0.1, validators=[django.core.validators.MinValueValidator(0.05)])),
                ('extended_can_id', models.BooleanField(default=False)),
                ('verify_results', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ISOTPEndpointScanRun',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('state', models.CharField(choices=[('CREATED', 'Scan was created and should run as soon as possible'), ('RUNNING', 'Scan is running'), ('PAUSED', 'Scan is paused'), ('FINISHED_SUCCESS', 'Scan successfully finished'), ('FINISHED_ERROR', 'Scan finished with an error')], default='CREATED', max_length=100)),
                ('desired_state', models.CharField(choices=[('PAUSED', 'Scan is paused'), ('RUNNING', 'Scan is running'), ('FINISHED', 'Scan finished w/o an error')], default='RUNNING', max_length=100)),
                ('error_description', models.CharField(blank=True, max_length=2048)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('scan_was_aborted', models.BooleanField(default=False)),
                ('config', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='scanner.isotpendpointscannerconfig')),
                ('hw_interface', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='core.hwinterface')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='UDSScannerConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('remote_scan_selected_channel', models.CharField(blank=True, max_length=50, null=True)),
                ('uds_scan_arguments', models.JSONField(default=dict, max_length=16384, validators=[scanner.validators.validate_uds_scan_arguments])),
            ],
            options={
                'ordering': ['name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='UDSScanRun',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('state', models.CharField(choices=[('CREATED', 'Scan was created and should run as soon as possible'), ('RUNNING', 'Scan is running'), ('PAUSED', 'Scan is paused'), ('FINISHED_SUCCESS', 'Scan successfully finished'), ('FINISHED_ERROR', 'Scan finished with an error')], default='CREATED', max_length=100)),
                ('desired_state', models.CharField(choices=[('PAUSED', 'Scan is paused'), ('RUNNING', 'Scan is running'), ('FINISHED', 'Scan finished w/o an error')], default='RUNNING', max_length=100)),
                ('error_description', models.CharField(blank=True, max_length=2048)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('scan_was_aborted', models.BooleanField(default=False)),
                ('smart_scan', models.BooleanField(default=False)),
                ('security_access_key_generation_server_url', models.URLField(blank=True, max_length=512, null=True)),
                ('config', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='scanner.udsscannerconfig')),
                ('hw_interface', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='core.hwinterface')),
                ('isotp_endpoint', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='scanner.isotpendpoint')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='UDSScanRunFinding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('results_file', models.FileField(upload_to='results')),
                ('scan_run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scan_run_findings', to='scanner.udsscanrun')),
            ],
        ),
        migrations.CreateModel(
            name='UDSScanRunPickleFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('pickle_file', models.FileField(upload_to='uds_pickles')),
                ('scan_run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scan_run_pickles', to='scanner.udsscanrun')),
            ],
        ),
        migrations.CreateModel(
            name='UDSScanRunLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('log_type', models.CharField(choices=[('SCANNER', 'Output of Scanner-Software'), ('UDS', 'Message log of all UDS messages during scan_run'), ('CAN', 'Message log of all CAN messages during scan_run')], default='SCANNER', max_length=100)),
                ('log_file', models.FileField(upload_to='logfiles')),
                ('scan_run_finding', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='log_files', to='scanner.udsscanrunfinding')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='UDSAnalyzerResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('name', models.CharField(max_length=500)),
                ('info', models.CharField(max_length=5000)),
                ('result_type', models.CharField(choices=[('INFORMAL', 'Informal result'), ('WARNING', 'Warning'), ('VULNERABILITY', 'Vulnerability')], default='INFORMAL', max_length=100)),
                ('scan_run_finding', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analyzer_results', to='scanner.udsscanrunfinding')),
            ],
        ),
        migrations.CreateModel(
            name='ISOTPEndpointScanRunLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('log_type', models.CharField(choices=[('SCANNER', 'Output of Scanner-Software'), ('UDS', 'Message log of all UDS messages during scan_run'), ('CAN', 'Message log of all CAN messages during scan_run')], default='SCANNER', max_length=100)),
                ('log_file', models.FileField(upload_to='logfiles')),
                ('scan_run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='log_files', to='scanner.isotpendpointscanrun')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ISOTPEndpointScanRunFinding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('rx_id', models.IntegerField(default=0)),
                ('tx_id', models.IntegerField(default=0)),
                ('ext_address', models.IntegerField(blank=True, default=None, null=True)),
                ('rx_ext_address', models.IntegerField(blank=True, default=None, null=True)),
                ('padding', models.BooleanField()),
                ('basecls', models.CharField(default='ISOTP', max_length=10)),
                ('scan_run', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scan_run_findings', to='scanner.isotpendpointscanrun')),
            ],
        ),
    ]
