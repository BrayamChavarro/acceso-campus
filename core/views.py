import base64
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Estudiante, Dispositivo, HistorialMovimiento
from .serializers import EstudianteSerializer, DispositivoSerializer, HistorialMovimientoSerializer

class EstudianteViewSet(viewsets.ModelViewSet):
    queryset = Estudiante.objects.all()
    serializer_class = EstudianteSerializer

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def registro_completo(self, request):
        data = request.data

        cc = data.get('documento_identidad')
        codigo_estudiante = data.get('codigo_estudiante')
        nombre_completo = data.get('nombre_completo')
        correo_institucional = data.get('correo_institucional')
        carrera = data.get('carrera')
        marca = data.get('marca')
        color = data.get('color')

        if not all([cc, codigo_estudiante, nombre_completo, correo_institucional]):
            return Response(
                {"error": "Faltan datos obligatorios del estudiante"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Estudiante.objects.filter(cc=cc).exists():
            return Response(
                {"error": "Ya existe un estudiante con este documento de identidad"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Estudiante.objects.filter(codigo_estudiante=codigo_estudiante).exists():
            return Response(
                {"error": "Ya existe un estudiante con este código"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Estudiante.objects.filter(correo_institucional=correo_institucional).exists():
            return Response(
                {"error": "Ya existe un estudiante con este correo institucional"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def save_b64_image(b64_str, filename_prefix):
            if not b64_str:
                return None

            if "," in b64_str:
                _, b64_str = b64_str.split(",", 1)

            image_bytes = base64.b64decode(b64_str)
            filename = f"{filename_prefix}_{uuid.uuid4().hex}.jpg"
            path = default_storage.save(f"estudiantes/{filename}", ContentFile(image_bytes))
            return default_storage.url(path)

        try:
            with transaction.atomic():
                estudiante = Estudiante.objects.create(
                    cc=cc,
                    codigo_estudiante=codigo_estudiante,
                    nombre_completo=nombre_completo,
                    correo_institucional=correo_institucional,
                    carrera=carrera or None,
                    foto_estudiante_url=save_b64_image(data.get('foto_estudiante'), 'estudiante'),
                )

                codigo_qr = f"{uuid.uuid4().hex}-{cc}"
                dispositivo = Dispositivo.objects.create(
                    estudiante=estudiante,
                    codigo_qr=codigo_qr,
                    foto_frontal_url=save_b64_image(data.get('foto_frontal'), 'frontal'),
                    foto_respaldo_url=save_b64_image(data.get('foto_respaldo'), 'respaldo'),
                )

            return Response(
                {
                    "mensaje": "Registro completado exitosamente",
                    "codigo_qr": dispositivo.codigo_qr,
                    "estudiante": {
                        "documento_identidad": estudiante.cc,
                        "codigo_estudiante": estudiante.codigo_estudiante,
                        "nombre_completo": estudiante.nombre_completo,
                        "correo_institucional": estudiante.correo_institucional,
                        "carrera": estudiante.carrera,
                        "marca": marca,
                        "color": color,
                        "foto_estudiante_url": estudiante.foto_estudiante_url,
                    },
                    "dispositivo": {
                        "codigo_qr": dispositivo.codigo_qr,
                        "foto_frontal_url": dispositivo.foto_frontal_url,
                        "foto_respaldo_url": dispositivo.foto_respaldo_url,
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            return Response(
                {"error": f"Error registrando estudiante: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class DispositivoViewSet(viewsets.ModelViewSet):
    queryset = Dispositivo.objects.all()
    serializer_class = DispositivoSerializer

    @action(detail=False, methods=['post'])
    def registrar_escaneo(self, request):
        codigo_qr = request.data.get('codigo_qr') or request.data.get('codigo_etiqueta')
        
        if not codigo_qr:
            return Response({"error": "Se requiere enviar 'codigo_qr' o 'codigo_etiqueta'"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Buscamos el dispositivo por codigo_qr o por el codigo del estudiante (cc o codigo_estudiante)
        dispositivo = Dispositivo.objects.filter(
            codigo_qr=codigo_qr
        ).first()

        # Si no lo encuentra por qr exacto del dispositivo, intenta buscar si escaneó el carnet del estudiante
        if not dispositivo:
            estudiante = Estudiante.objects.filter(cc=codigo_qr).first() or Estudiante.objects.filter(codigo_estudiante=codigo_qr).first()
            if estudiante:
                # Retorna el primer dispositivo de ese estudiante
                dispositivo = estudiante.dispositivos.first()
        
        if not dispositivo:
             return Response({"error": "Dispositivo o Estudiante no encontrado en la base de datos"}, status=status.HTTP_404_NOT_FOUND)

        # 2. Revisamos estado_actual (lógica de negocio)
        if dispositivo.estado_actual == Dispositivo.EstadoActual.AFUERA:
            nuevo_estado = Dispositivo.EstadoActual.ADENTRO
            tipo_movimiento = HistorialMovimiento.TipoMovimiento.ENTRADA
        else:
            nuevo_estado = Dispositivo.EstadoActual.AFUERA
            tipo_movimiento = HistorialMovimiento.TipoMovimiento.SALIDA

        # 3. Actualizar estado y guardarlo
        dispositivo.estado_actual = nuevo_estado
        dispositivo.save()

        # 4. Crear el historial correspondiente
        HistorialMovimiento.objects.create(
            dispositivo=dispositivo,
            tipo_movimiento=tipo_movimiento
        )

        # 5. Responder JSON
        return Response({
            "mensaje": "Escaneo registrado exitosamente",
            "nuevo_estado": dispositivo.estado_actual,
            "estudiante": {
                "documento_identidad": dispositivo.estudiante.cc,
                "codigo_estudiante": dispositivo.estudiante.codigo_estudiante,
                "nombre_completo": dispositivo.estudiante.nombre_completo,
                "correo_institucional": dispositivo.estudiante.correo_institucional,
                "carrera": dispositivo.estudiante.carrera,
                "foto_estudiante_url": dispositivo.estudiante.foto_estudiante_url,
            },
            "dispositivo": {
                "codigo_qr": dispositivo.codigo_qr,
                "foto_frontal_url": dispositivo.foto_frontal_url,
                "foto_respaldo_url": dispositivo.foto_respaldo_url,
            }
        }, status=status.HTTP_200_OK)


class HistorialMovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    # Usualmente el historial solo se lee por los administradores (ReadOnly)
    queryset = HistorialMovimiento.objects.all().order_by('-fecha_hora')
    serializer_class = HistorialMovimientoSerializer
