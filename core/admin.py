from django.contrib import admin
from .models import Estudiante, Dispositivo, HistorialMovimiento

@admin.register(Estudiante)
class EstudianteAdmin(admin.ModelAdmin):
    list_display = ('cc', 'codigo_estudiante', 'nombre_completo', 'carrera')
    search_fields = ('nombre_completo', 'cc', 'codigo_estudiante')

@admin.register(Dispositivo)
class DispositivoAdmin(admin.ModelAdmin):
    list_display = ('codigo_qr', 'estudiante', 'estado_actual')
    list_filter = ('estado_actual',)
    search_fields = ('codigo_qr', 'estudiante__nombre_completo')

@admin.register(HistorialMovimiento)
class HistorialMovimientoAdmin(admin.ModelAdmin):
    list_display = ('dispositivo', 'tipo_movimiento', 'fecha_hora')
    list_filter = ('tipo_movimiento', 'fecha_hora')
