from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EstudianteViewSet, DispositivoViewSet, HistorialMovimientoViewSet, auth_me

router = DefaultRouter()
router.register(r'estudiantes', EstudianteViewSet, basename='estudiante')
router.register(r'dispositivos', DispositivoViewSet, basename='dispositivo')
router.register(r'historial', HistorialMovimientoViewSet, basename='historial')

urlpatterns = [
    path('api/auth/me/', auth_me, name='auth_me'),
    path('api/', include(router.urls)),
]
