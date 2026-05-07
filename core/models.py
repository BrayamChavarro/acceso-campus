from django.db import models

class CodigoEstudianteSequence(models.Model):
    """
    Secuencia monotónica para generar códigos de estudiante coherentes (incrementales),
    sin depender de conteos o MAX() sobre strings y evitando condiciones de carrera.
    """
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'codigo_estudiante_sequence'

class Estudiante(models.Model):
    cc = models.CharField(max_length=20, primary_key=True)
    codigo_estudiante = models.CharField(max_length=50, unique=True)
    nombre_completo = models.CharField(max_length=200)
    correo_institucional = models.EmailField(max_length=200, unique=True)
    carrera = models.CharField(max_length=150, null=True, blank=True)
    foto_estudiante_url = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.nombre_completo} ({self.codigo_estudiante})"

    class Meta:
        db_table = 'estudiante'


class Dispositivo(models.Model):
    class EstadoActual(models.TextChoices):
        ADENTRO = 'ADENTRO', 'Adentro'
        AFUERA = 'AFUERA', 'Afuera'

    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='dispositivos', db_column='cc_estudiante')
    marca = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)
    foto_frontal_url = models.TextField(null=True, blank=True)
    foto_respaldo_url = models.TextField(null=True, blank=True)
    codigo_qr = models.CharField(max_length=200, unique=True)
    estado_actual = models.CharField(
        max_length=10,
        choices=EstadoActual.choices,
        default=EstadoActual.AFUERA,
    )

    def __str__(self):
        return f"Dispositivo QR: {self.codigo_qr} - {self.estado_actual}"

    class Meta:
        db_table = 'dispositivo'


class HistorialMovimiento(models.Model):
    class TipoMovimiento(models.TextChoices):
        ENTRADA = 'ENTRADA', 'Entrada'
        SALIDA = 'SALIDA', 'Salida'

    dispositivo = models.ForeignKey(Dispositivo, on_delete=models.CASCADE, related_name='movimientos', db_column='id_dispositivo')
    tipo_movimiento = models.CharField(max_length=10, choices=TipoMovimiento.choices)
    fecha_hora = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo_movimiento} - {self.dispositivo.codigo_qr} a las {self.fecha_hora}"

    class Meta:
        db_table = 'historial_movimientos'
