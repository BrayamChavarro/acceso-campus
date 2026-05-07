from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_dispositivo_color_dispositivo_marca"),
    ]

    operations = [
        migrations.CreateModel(
            name="CodigoEstudianteSequence",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "codigo_estudiante_sequence",
            },
        ),
    ]

