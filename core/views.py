from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes, api_view
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Estudiante, Dispositivo, HistorialMovimiento
from .serializers import EstudianteSerializer, DispositivoSerializer, HistorialMovimientoSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_me(request):
    return Response({
        "username": request.user.username,
        "is_superuser": request.user.is_superuser
    })

class EstudianteViewSet(viewsets.ModelViewSet):
    queryset = Estudiante.objects.all()
    serializer_class = EstudianteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(nombre_completo__icontains=search) |
                Q(cc__icontains=search) |
                Q(codigo_estudiante__icontains=search) |
                Q(correo_institucional__icontains=search)
            )
        return queryset

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def registro_completo(self, request):
        import base64
        import uuid
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage

        data = request.data
        cc = data.get('documento_identidad')
        codigo = data.get('codigo_estudiante')
        nombre = data.get('nombre_completo')
        correo = data.get('correo_institucional')
        carrera = data.get('carrera')
        marca = data.get('marca')
        color = data.get('color')

        if not all([cc, codigo, nombre, correo]):
            return Response({"error": "Faltan datos obligatorios del estudiante"}, status=status.HTTP_400_BAD_REQUEST)

        # Función auxiliar para guardar base64
        def save_b64_image(b64_str, filename_prefix):
            if not b64_str: return None
            try:
                format_str, imgstr = b64_str.split(';base64,') 
                ext = format_str.split('/')[-1]
                img_data = ContentFile(base64.b64decode(imgstr))
                file_name = f"{filename_prefix}_{uuid.uuid4().hex[:8]}.{ext}"
                path = default_storage.save(file_name, img_data)
                return default_storage.url(path)
            except Exception as e:
                print(f"Error guardando imagen {filename_prefix}: {e}")
                return None

        # Crear o actualizar Estudiante
        estudiante, created = Estudiante.objects.update_or_create(
            cc=cc,
            defaults={
                'codigo_estudiante': codigo,
                'nombre_completo': nombre,
                'correo_institucional': correo,
                'carrera': carrera,
            }
        )

        foto_estudiante = save_b64_image(data.get('foto_estudiante'), f"estudiante_{cc}")
        if foto_estudiante:
            estudiante.foto_estudiante_url = foto_estudiante
            estudiante.save()

        # Generar QR y crear Dispositivo
        codigo_qr = str(uuid.uuid4())
        dispositivo = Dispositivo(
            estudiante=estudiante,
            codigo_qr=codigo_qr,
            marca=marca,
            color=color,
            estado_actual=Dispositivo.EstadoActual.AFUERA
        )
        
        foto_frontal = save_b64_image(data.get('foto_frontal'), f"dispositivo_front_{cc}")
        foto_respaldo = save_b64_image(data.get('foto_respaldo'), f"dispositivo_back_{cc}")
        
        dispositivo.foto_frontal_url = foto_frontal
        dispositivo.foto_respaldo_url = foto_respaldo
        dispositivo.save()

        return Response({
            "mensaje": "Estudiante y dispositivo registrados con éxito",
            "codigo_qr": codigo_qr
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def recuperar_qr(self, request):
        cc = request.data.get('documento_identidad')
        codigo = request.data.get('codigo_estudiante')
        
        if not cc or not codigo:
            return Response({"error": "Debe proporcionar documento de identidad y código de estudiante"}, status=status.HTTP_400_BAD_REQUEST)
            
        estudiante = Estudiante.objects.filter(cc=cc, codigo_estudiante=codigo).first()
        if not estudiante:
            return Response({"error": "Estudiante no registrado con esos datos"}, status=status.HTTP_404_NOT_FOUND)
            
        dispositivo = estudiante.dispositivos.first()
        if not dispositivo:
            return Response({"error": "Estudiante no tiene dispositivo registrado"}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            "mensaje": "QR recuperado exitosamente",
            "codigo_qr": dispositivo.codigo_qr,
            "estudiante": estudiante.nombre_completo
        }, status=status.HTTP_200_OK)

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

    @action(detail=False, methods=['get'])
    def estado_visitante(self, request):
        cc = request.query_params.get('cc')
        if not cc:
            return Response({"error": "Debe proporcionar la cédula"}, status=status.HTTP_400_BAD_REQUEST)
        
        estudiante = Estudiante.objects.filter(cc=cc).first()
        if not estudiante:
            return Response({"existe": False}, status=status.HTTP_200_OK)
            
        dispositivo = estudiante.dispositivos.first()
        if not dispositivo:
             return Response({"existe": False}, status=status.HTTP_200_OK)
             
        return Response({
            "existe": True,
            "estudiante": estudiante.nombre_completo,
            "marca": dispositivo.marca,
            "color": dispositivo.color,
            "estado_actual": dispositivo.estado_actual
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def registrar_visitante(self, request):
        data = request.data
        cc = data.get('documento_identidad')
        nombre = data.get('nombre_completo')
        marca = data.get('marca')
        color = data.get('color')

        if not cc:
            return Response({"error": "Se requiere Cédula"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar o crear estudiante visitante
        estudiante = Estudiante.objects.filter(cc=cc).first()
        if not estudiante:
            if not nombre:
                return Response({"error": "Se requiere Nombre para nuevos visitantes"}, status=status.HTTP_400_BAD_REQUEST)
            estudiante = Estudiante.objects.create(
                cc=cc,
                codigo_estudiante=f"VIS-{cc}",
                nombre_completo=nombre,
                correo_institucional=f"visitante_{cc}@visitante.local",
                carrera="Visitante"
            )
        else:
            if nombre:
                estudiante.nombre_completo = nombre
                estudiante.save()

        # Buscar o crear dispositivo
        dispositivo = estudiante.dispositivos.first()
        if not dispositivo:
            import uuid
            codigo_qr = f"VIS-QR-{uuid.uuid4()}"
            dispositivo = Dispositivo.objects.create(
                estudiante=estudiante,
                codigo_qr=codigo_qr,
                marca=marca,
                color=color,
                estado_actual=Dispositivo.EstadoActual.ADENTRO
            )
            tipo_mov = HistorialMovimiento.TipoMovimiento.ENTRADA
            msg = "Ingreso confirmado"
        else:
            if marca: dispositivo.marca = marca
            if color: dispositivo.color = color
            
            if dispositivo.estado_actual == Dispositivo.EstadoActual.AFUERA:
                dispositivo.estado_actual = Dispositivo.EstadoActual.ADENTRO
                tipo_mov = HistorialMovimiento.TipoMovimiento.ENTRADA
                msg = "Ingreso confirmado"
            else:
                dispositivo.estado_actual = Dispositivo.EstadoActual.AFUERA
                tipo_mov = HistorialMovimiento.TipoMovimiento.SALIDA
                msg = "Salida confirmada"
            dispositivo.save()

        # Registrar el movimiento
        HistorialMovimiento.objects.create(
            dispositivo=dispositivo,
            tipo_movimiento=tipo_mov
        )

        return Response({
            "mensaje": f"Visitante registrado y {msg} exitosamente",
            "estudiante": estudiante.nombre_completo,
            "nuevo_estado": dispositivo.estado_actual
        }, status=status.HTTP_200_OK)


class HistorialMovimientoViewSet(viewsets.ReadOnlyModelViewSet):
    # Usualmente el historial solo se lee por los administradores (ReadOnly)
    queryset = HistorialMovimiento.objects.all().order_by('-fecha_hora')
    serializer_class = HistorialMovimientoSerializer

    @action(detail=False, methods=['get'])
    def reporte_sesiones(self, request):
        from django.db.models import Q
        from django.utils import timezone
        import datetime
        
        filtro_fecha = request.query_params.get('rango', 'todos')
        search = request.query_params.get('search', '').lower()
        fecha_especifica_str = request.query_params.get('fecha_especifica', None)

        movimientos = HistorialMovimiento.objects.all().select_related('dispositivo', 'dispositivo__estudiante').order_by('dispositivo_id', 'fecha_hora')
        
        if search:
            movimientos = movimientos.filter(
                Q(dispositivo__estudiante__nombre_completo__icontains=search) |
                Q(dispositivo__estudiante__cc__icontains=search) |
                Q(dispositivo__estudiante__codigo_estudiante__icontains=search)
            )

        now = timezone.localtime(timezone.now())
        if filtro_fecha == 'hoy':
            movimientos = movimientos.filter(fecha_hora__date=now.date())
        elif filtro_fecha == 'semana':
            start_week = now.date() - datetime.timedelta(days=now.weekday())
            movimientos = movimientos.filter(fecha_hora__date__gte=start_week)
        elif filtro_fecha == 'mes':
            movimientos = movimientos.filter(fecha_hora__year=now.year, fecha_hora__month=now.month)
            
        if fecha_especifica_str:
            try:
                fecha_obj = datetime.datetime.strptime(fecha_especifica_str, "%Y-%m-%d").date()
                movimientos = movimientos.filter(fecha_hora__date=fecha_obj)
            except ValueError:
                pass
        
        # Agrupación por dispositivo y fecha:
        registros_diarios = {} # key: (did, fecha_str)
        
        for mov in movimientos:
            did = mov.dispositivo_id
            local_dt = timezone.localtime(mov.fecha_hora)
            fecha_str = local_dt.date().isoformat()
            hora_str = local_dt.time().strftime("%I:%M %p")
            
            key = (did, fecha_str)
            
            if key not in registros_diarios:
                registros_diarios[key] = {
                    "id": f"diario_{did}_{fecha_str}",
                    "estudiante": mov.dispositivo.estudiante.nombre_completo,
                    "cc": mov.dispositivo.estudiante.cc,
                    "carrera": mov.dispositivo.estudiante.carrera or "N/A",
                    "correo": mov.dispositivo.estudiante.correo_institucional,
                    "marca": mov.dispositivo.marca or "N/A",
                    "color": mov.dispositivo.color or "N/A",
                    "foto_estudiante": mov.dispositivo.estudiante.foto_estudiante_url,
                    "foto_frontal": mov.dispositivo.foto_frontal_url,
                    "foto_respaldo": mov.dispositivo.foto_respaldo_url,
                    "fecha": fecha_str,
                    "hora_ingreso": "--:-- --",
                    "hora_salida": "--:-- --",
                    "estado": "Desconocido",
                    "timestamp_ingreso": mov.fecha_hora.timestamp(),
                    "timeline": []
                }
            
            registro = registros_diarios[key]
            
            # Registrar en la línea de tiempo
            if mov.tipo_movimiento == HistorialMovimiento.TipoMovimiento.ENTRADA:
                registro["timeline"].append({
                    "ingreso": hora_str,
                    "salida": None
                })
                registro["estado"] = "Adentro"
            else:
                if registro["timeline"] and registro["timeline"][-1]["salida"] is None:
                    registro["timeline"][-1]["salida"] = hora_str
                else:
                    registro["timeline"].append({
                        "ingreso": "No registrado",
                        "salida": hora_str
                    })
                registro["estado"] = "Afuera"

            # Actualizar primera entrada y última salida general del día
            entradas = [t["ingreso"] for t in registro["timeline"] if t["ingreso"] != "No registrado"]
            salidas = [t["salida"] for t in registro["timeline"] if t["salida"] is not None]
            
            if entradas:
                registro["hora_ingreso"] = entradas[0]
            if salidas:
                registro["hora_salida"] = salidas[-1]
            elif entradas and not salidas:
                registro["hora_salida"] = "--:-- --"

        sesiones = list(registros_diarios.values())
        sesiones.sort(key=lambda x: x.get("timestamp_ingreso", 0), reverse=True)

        estudiantes_adentro = Dispositivo.objects.filter(estado_actual=Dispositivo.EstadoActual.ADENTRO).count()
        
        # KPI Ingresos dinámico
        ingresos_filtro = 0
        if fecha_especifica_str:
            try:
                f_obj = datetime.datetime.strptime(fecha_especifica_str, "%Y-%m-%d").date()
                ingresos_filtro = HistorialMovimiento.objects.filter(
                    tipo_movimiento=HistorialMovimiento.TipoMovimiento.ENTRADA,
                    fecha_hora__date=f_obj
                ).count()
            except ValueError:
                pass
        else:
            if filtro_fecha == 'hoy':
                ingresos_filtro = HistorialMovimiento.objects.filter(
                    tipo_movimiento=HistorialMovimiento.TipoMovimiento.ENTRADA,
                    fecha_hora__date=now.date()
                ).count()
            elif filtro_fecha == 'semana':
                start_week = now.date() - datetime.timedelta(days=now.weekday())
                ingresos_filtro = HistorialMovimiento.objects.filter(
                    tipo_movimiento=HistorialMovimiento.TipoMovimiento.ENTRADA,
                    fecha_hora__date__gte=start_week
                ).count()
            elif filtro_fecha == 'mes':
                ingresos_filtro = HistorialMovimiento.objects.filter(
                    tipo_movimiento=HistorialMovimiento.TipoMovimiento.ENTRADA,
                    fecha_hora__year=now.year,
                    fecha_hora__month=now.month
                ).count()
            else:
                ingresos_filtro = HistorialMovimiento.objects.filter(
                    tipo_movimiento=HistorialMovimiento.TipoMovimiento.ENTRADA
                ).count()

        return Response({
            "sesiones": sesiones,
            "resumen": {
                "estudiantes_adentro": estudiantes_adentro,
                "ingresos_hoy": ingresos_filtro,
                "total_registros": len(sesiones)
            }
        })
