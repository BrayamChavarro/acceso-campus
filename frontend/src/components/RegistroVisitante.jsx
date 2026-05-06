import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, ChevronRight, CheckCircle, Search, UserCheck } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api`;

const RegistroVisitante = ({ token, isDarkMode }) => {
    const [step, setStep] = useState(1); // 1: Buscar CC, 2: Confirmar/Rellenar datos
    const [formData, setFormData] = useState({
        nombre_completo: '',
        documento_identidad: '',
        marca: '',
        color: ''
    });
    const [estadoActual, setEstadoActual] = useState(null); // 'ADENTRO' o 'AFUERA' o null (nuevo)
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState('');

    const handleBuscar = async (e) => {
        e.preventDefault();
        if (!formData.documento_identidad) return;
        
        setLoading(true);
        setError('');
        setSuccess(null);

        try {
            const res = await axios.get(`${API_URL}/dispositivos/estado_visitante/`, {
                params: { cc: formData.documento_identidad },
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data.existe) {
                setFormData({
                    ...formData,
                    nombre_completo: res.data.estudiante,
                    marca: res.data.marca || '',
                    color: res.data.color || ''
                });
                setEstadoActual(res.data.estado_actual);
            } else {
                setEstadoActual(null); // Visitante nuevo
            }
            setStep(2);
        } catch (err) {
            setError('Error al buscar la cédula.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const res = await axios.post(`${API_URL}/dispositivos/registrar_visitante/`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(res.data);
            setStep(1);
            setFormData({
                nombre_completo: '',
                documento_identidad: '',
                marca: '',
                color: ''
            });
            setEstadoActual(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al procesar la solicitud.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`max-w-2xl mx-auto p-6 md:p-8 rounded-xl shadow-md border-t-4 border-blue-500 mt-8 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <div className={`flex items-center gap-3 mb-6 border-b pb-4 ${isDarkMode ? 'border-slate-700' : ''}`}>
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <UserPlus size={28} />
                </div>
                <div>
                    <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Control de Visitantes</h2>
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Gestión de ingresos y salidas mediante Cédula.</p>
                </div>
            </div>

            {error && <div className={`mb-6 p-4 rounded-lg border font-medium ${isDarkMode ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200'}`}>{error}</div>}
            
            {success && (
                <div className={`mb-6 p-4 rounded-lg border flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                    <CheckCircle size={40} className="text-green-500 mb-2" />
                    <h3 className={`text-xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>¡Operación Exitosa!</h3>
                    <p className={`mt-1 ${isDarkMode ? 'text-green-500' : 'text-green-700'}`}>{success.mensaje}</p>
                </div>
            )}

            {step === 1 && (
                <form onSubmit={handleBuscar} className="space-y-6">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Número de Documento (CC) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Search className={`absolute left-3 top-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} size={20} />
                            <input 
                                required
                                autoFocus
                                type="text"
                                className={`w-full border p-3 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900'}`}
                                placeholder="Ej: 1000123456" 
                                value={formData.documento_identidad} 
                                onChange={e => setFormData({...formData, documento_identidad: e.target.value})} 
                            />
                        </div>
                        <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Ingresa la cédula para verificar si el visitante ya está registrado.</p>
                    </div>
                    <div className="flex justify-end">
                        <button 
                            type="submit"
                            disabled={loading || !formData.documento_identidad}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition font-bold shadow-md"
                        >
                            {loading ? 'Buscando...' : 'Verificar Cédula'} <ChevronRight size={18}/>
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {estadoActual ? (
                        <div className={`p-4 rounded-lg flex items-start gap-3 border ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                            <UserCheck className="text-blue-500 mt-0.5" size={24} />
                            <div>
                                <h4 className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-800'}`}>Visitante Encontrado</h4>
                                <p className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-600'}`}>Este visitante ya está en el sistema. Puedes actualizar sus datos si es necesario.</p>
                                <div className={`mt-2 text-sm ${isDarkMode ? 'text-slate-300' : ''}`}>
                                    Estado actual: <strong className={estadoActual === 'ADENTRO' ? 'text-green-500' : (isDarkMode ? 'text-slate-400' : 'text-gray-600')}>{estadoActual}</strong>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                            <h4 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Nuevo Visitante</h4>
                            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Por favor, completa los datos para registrarlo por primera vez.</p>
                        </div>
                    )}

                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nombre Completo <span className="text-red-500">*</span></label>
                                <input 
                                    required
                                    type="text"
                                    className={`w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white'}`}
                                    placeholder="Ej: Juan Pérez" 
                                    value={formData.nombre_completo} 
                                    onChange={e => setFormData({...formData, nombre_completo: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Cédula (CC)</label>
                                <input 
                                    disabled
                                    type="text"
                                    className={`w-full border p-2.5 rounded-lg outline-none cursor-not-allowed ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-gray-100 text-gray-500'}`}
                                    value={formData.documento_identidad} 
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className={`text-lg font-bold mb-3 mt-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Datos del Dispositivo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Marca</label>
                                <input 
                                    type="text"
                                    className={`w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white'}`}
                                    placeholder="Ej: HP, Dell..." 
                                    value={formData.marca} 
                                    onChange={e => setFormData({...formData, marca: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Color Principal</label>
                                <input 
                                    type="text"
                                    className={`w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white'}`}
                                    placeholder="Ej: Negro..." 
                                    value={formData.color} 
                                    onChange={e => setFormData({...formData, color: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`flex justify-between pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                        <button 
                            type="button"
                            onClick={() => {
                                setStep(1);
                                setSuccess(null);
                                setError('');
                            }}
                            className={`px-4 py-2 font-medium ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Volver a Búsqueda
                        </button>
                        
                        {estadoActual === 'ADENTRO' ? (
                            <button 
                                type="submit"
                                disabled={loading}
                                className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold shadow hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {loading ? 'Procesando...' : 'Registrar Salida'}
                            </button>
                        ) : (
                            <button 
                                type="submit"
                                disabled={loading || !formData.nombre_completo}
                                className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold shadow hover:bg-green-700 transition disabled:opacity-50"
                            >
                                {loading ? 'Procesando...' : 'Registrar Ingreso'}
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
};

export default RegistroVisitante;
