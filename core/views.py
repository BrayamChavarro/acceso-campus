import base64
import io
import uuid

import cloudinary.uploader
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Estudiante, Dispositivo, HistorialMovimiento, CodigoEstudianteSequence
from .serializers import EstudianteSerializer, DispositivoSerializer, HistorialMovimientoSerializer

class EstudianteViewSet(viewsets.ModelViewSet):
    queryset = Estudiante.objects.all()
    serializer_class = EstudianteSerializer

    def get_permissions(self):
        # Endpoints públicos (sin JWT)
        if getattr(self, 'action', None) in {'registro_completo', 'recuperar_qr', 'generar_codigo'}:
            return [AllowAny()]
        # Resto: protegido
        return [IsAuthenticated()]

    def _next_codigo_estudiante(self):
        seq = CodigoEstudianteSequence.objects.create()
        return str(seq.id).zfill(6)

    @action(detail=False, methods=['post'])
    def generar_codigo(self, request):
        with transaction.atomic():
            codigo = self._next_codigo_estudiante()
        return Response({"codigo_estudiante": codigo}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def recuperar_qr(self, request):
        """
        Recupera el código QR del primer dispositivo asociado a un estudiante.
        Acepta documento_identidad (cc) y/o codigo_estudiante.
        """
        cc = (request.data.get('documento_identidad') or '').strip()
        codigo = (request.data.get('codigo_estudiante') or '').strip()

        if not cc and not codigo:
            return Response({"error": "Debes enviar documento_identidad o codigo_estudiante"}, status=status.HTTP_400_BAD_REQUEST)

        estudiante = None
        if cc:
            estudiante = Estudiante.objects.filter(cc=cc).first()
        if not estudiante and codigo:
            estudiante = Estudiante.objects.filter(codigo_estudiante=codigo).first()

        if not estudiante:
            return Response({"error": "Estudiante no encontrado. Verifica los datos o regístrate."}, status=status.HTTP_404_NOT_FOUND)

        dispositivo = estudiante.dispositivos.order_by('id').first()
        if not dispositivo:
            return Response({"error": "No hay dispositivo registrado para este estudiante."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "estudiante": estudiante.nombre_completo,
                "codigo_qr": dispositivo.codigo_qr,
                "foto_estudiante_url": estudiante.foto_estudiante_url,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'])
    def registro_completo(self, request):
        data = request.data

        cc = data.get('documento_identidad')
        codigo_estudiante = (data.get('codigo_estudiante') or '').strip()
        nombre_completo = data.get('nombre_completo')
        correo_institucional = data.get('correo_institucional')
        carrera = data.get('carrera')
        marca = data.get('marca')
        color = data.get('color')

        if not all([cc, nombre_completo, correo_institucional]):
            return Response(
                {"error": "Faltan datos obligatorios del estudiante"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Estudiante.objects.filter(cc=cc).exists():
            return Response(
                {"error": "Ya existe un estudiante con este documento de identidad"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if codigo_estudiante and Estudiante.objects.filter(codigo_estudiante=codigo_estudiante).exists():
            return Response({"error": "Ya existe un estudiante con este código"}, status=status.HTTP_400_BAD_REQUEST)

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
            result = cloudinary.uploader.upload(
                io.BytesIO(image_bytes),
                folder="acceso-campus",
                resource_type="image",
            )
            return result["secure_url"]

        try:
            with transaction.atomic():
                if not codigo_estudiante:
                    # Generación automática si no se envía código (casos sin carnet/código).
                    codigo_estudiante = self._next_codigo_estudiante()
                    # Evitar colisión si por algún motivo ya existiera.
                    while Estudiante.objects.filter(codigo_estudiante=codigo_estudiante).exists():
                        codigo_estudiante = self._next_codigo_estudiante()

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
    queryset = HistorialMovimiento.objects.all().order_by('-fecha_hora')
    serializer_class = HistorialMovimientoSerializer

    @action(detail=False, methods=['get'])
    def reporte_sesiones(self, request):
        from datetime import date, timedelta
        from django.db.models import Q

        rango = request.query_params.get('rango', 'hoy')
        search = request.query_params.get('search', '').strip()
        fecha_especifica = request.query_params.get('fecha_especifica', '')

        hoy = date.today()

        # --- Rango base ---
        if rango == 'hoy':
            qs = HistorialMovimiento.objects.filter(fecha_hora__date=hoy)
        elif rango == 'semana':
            inicio = hoy - timedelta(days=hoy.weekday())
            if fecha_especifica:
                try:
                    dia = date.fromisoformat(fecha_especifica)
                    qs = HistorialMovimiento.objects.filter(fecha_hora__date=dia)
                except ValueError:
                    qs = HistorialMovimiento.objects.filter(fecha_hora__date__range=[inicio, hoy])
            else:
                qs = HistorialMovimiento.objects.filter(fecha_hora__date__range=[inicio, hoy])
        elif rango == 'mes':
            inicio_mes = hoy.replace(day=1)
            if fecha_especifica:
                try:
                    dia = date.fromisoformat(fecha_especifica)
                    qs = HistorialMovimiento.objects.filter(fecha_hora__date=dia)
                except ValueError:
                    qs = HistorialMovimiento.objects.filter(fecha_hora__date__range=[inicio_mes, hoy])
            else:
                qs = HistorialMovimiento.objects.filter(fecha_hora__date__range=[inicio_mes, hoy])
        else:  # 'todos'
            qs = HistorialMovimiento.objects.all()

        # --- Búsqueda ---
        if search:
            qs = qs.filter(
                Q(dispositivo__estudiante__nombre_completo__icontains=search) |
                Q(dispositivo__estudiante__cc__icontains=search) |
                Q(dispositivo__estudiante__codigo_estudiante__icontains=search) |
                Q(dispositivo__estudiante__correo_institucional__icontains=search)
            )

        qs = qs.select_related('dispositivo__estudiante').order_by('dispositivo', 'fecha_hora')

        # --- Agrupar por dispositivo + fecha (sesión = entrada + salida del mismo día) ---
        from collections import defaultdict
        grupos = defaultdict(lambda: {'entrada': None, 'salida': None, 'dispositivo': None, 'estudiante': None})

        for mov in qs:
            key = (mov.dispositivo_id, mov.fecha_hora.date().isoformat())
            grupos[key]['dispositivo'] = mov.dispositivo
            grupos[key]['estudiante'] = mov.dispositivo.estudiante
            if mov.tipo_movimiento == HistorialMovimiento.TipoMovimiento.ENTRADA:
                if grupos[key]['entrada'] is None:
                    grupos[key]['entrada'] = mov
            else:
                grupos[key]['salida'] = mov

        sesiones = []
        for (disp_id, fecha_str), data in sorted(grupos.items(), key=lambda x: x[0][1], reverse=True):
            est = data['estudiante']
            disp = data['dispositivo']
            entrada = data['entrada']
            salida = data['salida']
            sesiones.append({
                'id': f"{disp_id}-{fecha_str}",
                'estudiante': est.nombre_completo,
                'cc': est.cc,
                'codigo_estudiante': est.codigo_estudiante,
                'carrera': est.carrera or '',
                'correo': est.correo_institucional,
                'fecha': fecha_str,
                'hora_ingreso': entrada.fecha_hora.strftime('%H:%M') if entrada else None,
                'hora_salida': salida.fecha_hora.strftime('%H:%M') if salida else None,
                'estado_actual': disp.estado_actual,
                # URLs absolutas (Cloudinary) o rutas relativas (/media/...) para el dashboard
                'foto_estudiante': est.foto_estudiante_url,
                'foto_frontal': disp.foto_frontal_url,
                'foto_respaldo': disp.foto_respaldo_url,
                'marca': disp.marca or '',
                'color': disp.color or '',
            })

        # --- KPIs ---
        estudiantes_adentro = Dispositivo.objects.filter(
            estado_actual=Dispositivo.EstadoActual.ADENTRO
        ).count()

        ingresos_hoy = HistorialMovimiento.objects.filter(
            fecha_hora__date=hoy,
            tipo_movimiento=HistorialMovimiento.TipoMovimiento.ENTRADA
        ).count()

        return Response({
            'sesiones': sesiones,
            'resumen': {
                'estudiantes_adentro': estudiantes_adentro,
                'ingresos_hoy': ingresos_hoy,
                'total_registros': len(sesiones),
            }
        })
