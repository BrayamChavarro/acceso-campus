import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from core.models import Estudiante, Dispositivo

d = Dispositivo.objects.last()
if d:
    print("QR:", d.codigo_qr)
    print("Estudiante foto URL:", repr(d.estudiante.foto_estudiante_url)[:100])
    print("Frontal foto URL:", repr(d.foto_frontal_url)[:100])
else:
    print("No devices found")
