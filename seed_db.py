import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Estudiante, Dispositivo

def run_seed():
    # 1. Crear un estudiante
    estudiante, created = Estudiante.objects.get_or_create(
        cc="123456789",
        defaults={
            "codigo_estudiante": "20261001",
            "nombre_completo": "Juan Pérez",
            "correo_institucional": "juan.perez@universidad.edu.co",
            "carrera": "Ingeniería de Sistemas",
            "foto_estudiante_url": "https://via.placeholder.com/150"
        }
    )
    
    if created:
        print(f"✅ Estudiante creado: {estudiante.nombre_completo}")
    else:
        print(f"⚠️ Estudiante ya existía: {estudiante.nombre_completo}")

    # 2. Crear un dispositivo para ese estudiante
    dispositivo, created_disp = Dispositivo.objects.get_or_create(
        codigo_qr="ABC-123",
        defaults={
            "estudiante": estudiante,
            "foto_frontal_url": "https://via.placeholder.com/150",
            "foto_respaldo_url": "https://via.placeholder.com/150",
            "estado_actual": Dispositivo.EstadoActual.AFUERA
        }
    )
    
    if created_disp:
        print(f"✅ Dispositivo creado con QR: {dispositivo.codigo_qr}")
    else:
        print(f"⚠️ Dispositivo ya existía con QR: {dispositivo.codigo_qr}")

if __name__ == '__main__':
    run_seed()
