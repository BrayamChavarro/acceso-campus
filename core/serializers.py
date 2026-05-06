from rest_framework import serializers
from .models import Estudiante, Dispositivo, HistorialMovimiento

class EstudianteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estudiante
        fields = '__all__'


class DispositivoSerializer(serializers.ModelSerializer):
    # Al leer (GET), querremos ver los detalles básicos del estudiante sin hacer otra petición
    estudiante_detalle = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Dispositivo
        fields = '__all__'
        # estudiante_cc (o 'estudiante' a nivel modelo) va a recibir el primary_key ('cc')

    def get_estudiante_detalle(self, obj):
        if obj.estudiante:
            return {
                "nombre_completo": obj.estudiante.nombre_completo,
                "cc": obj.estudiante.cc,
                "carrera": obj.estudiante.carrera,
                "foto_estudiante_url": obj.estudiante.foto_estudiante_url
            }
        return None


class HistorialMovimientoSerializer(serializers.ModelSerializer):
    estudiante_detalle = serializers.SerializerMethodField(read_only=True)
    codigo_qr = serializers.CharField(source='dispositivo.codigo_qr', read_only=True)

    class Meta:
        model = HistorialMovimiento
        fields = '__all__'

    def get_estudiante_detalle(self, obj):
        estudiante = obj.dispositivo.estudiante
        return {
            "documento_identidad": estudiante.cc,
            "codigo_estudiante": estudiante.codigo_estudiante,
            "nombre_completo": estudiante.nombre_completo,
            "correo_institucional": estudiante.correo_institucional,
            "carrera": estudiante.carrera,
            "foto_estudiante_url": estudiante.foto_estudiante_url
        }
