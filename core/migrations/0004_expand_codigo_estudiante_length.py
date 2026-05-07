from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_codigo_estudiante_sequence"),
    ]

    operations = [
        migrations.AlterField(
            model_name="estudiante",
            name="codigo_estudiante",
            field=models.CharField(max_length=200, unique=True),
        ),
    ]

