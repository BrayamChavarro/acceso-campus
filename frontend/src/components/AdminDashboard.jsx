import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Calendar, Users, LogIn, Clock, RefreshCw, X, Mail, Edit, Trash2, Save } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api';

const AdminDashboard = ({ token, isDarkMode }) => {
    const [sesiones, setSesiones] = useState([]);
    const [resumen, setResumen] = useState({ estudiantes_adentro: 0, ingresos_hoy: 0, total_registros: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    
    // Tabs
    const [activeTab, setActiveTab] = useState('historial'); // 'historial' | 'usuarios'

    // Filters Historial
    const [rangoFecha, setRangoFecha] = useState('hoy');
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(null);

    // Users Directory
    const [usuarios, setUsuarios] = useState([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(false);
    const [searchUsuario, setSearchUsuario] = useState('');
    const [editingUser, setEditingUser] = useState(null);

    const formatDateStr = (date) => {
        if (!date) return '';
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    useEffect(() => {
        if (rangoFecha === 'semana' || rangoFecha === 'mes') {
            setSelectedDate(formatDateStr(new Date()));
        } else {
            setSelectedDate(null);
        }
    }, [rangoFecha]);

    const fetchDatos = async () => {
        setLoading(true);
        try {
            const params = { rango: rangoFecha, search };
            if (selectedDate) params.fecha_especifica = selectedDate;

            const res = await axios.get(`${API_URL}/historial/reporte_sesiones/`, {
                headers: { Authorization: `Bearer ${token}` },
                params: params
            });
            setSesiones(res.data.sesiones);
            setResumen(res.data.resumen);
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchDatos();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [rangoFecha, search, selectedDate, token]);

    const fetchUsuarios = async () => {
        setLoadingUsuarios(true);
        try {
            const res = await axios.get(`${API_URL}/estudiantes/`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { search: searchUsuario }
            });
            // Dependiendo de si hay paginación o no, `res.data` puede ser un array o un objeto con `results`
            setUsuarios(Array.isArray(res.data) ? res.data : res.data.results || []);
        } catch (error) {
            console.error("Error fetching users", error);
        } finally {
            setLoadingUsuarios(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'usuarios') {
            const delayDebounceFn = setTimeout(() => {
                fetchUsuarios();
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [activeTab, searchUsuario, token]);

    const handleDeleteUser = async (cc) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esto borrará también sus dispositivos y su historial de accesos.')) {
            try {
                await axios.delete(`${API_URL}/estudiantes/${cc}/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchUsuarios(); // refresh list
            } catch (err) {
                alert('Error al eliminar el usuario.');
            }
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`${API_URL}/estudiantes/${editingUser.cc}/`, {
                nombre_completo: editingUser.nombre_completo,
                correo_institucional: editingUser.correo_institucional,
                carrera: editingUser.carrera
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingUser(null);
            fetchUsuarios(); // refresh list
        } catch (err) {
            alert('Error al actualizar el usuario.');
        }
    };

    const getWeekDays = () => {
        const curr = new Date();
        const day = curr.getDay() || 7; // Convertir Sunday 0 -> 7
        const first = curr.getDate() - day + 1; // Lunes
        const days = [];
        for (let i = 0; i < 7; i++) {
            const next = new Date(curr.getTime());
            next.setDate(first + i);
            days.push(next);
        }
        return days;
    };

    const getMonthDays = () => {
        const curr = new Date();
        const year = curr.getFullYear();
        const month = curr.getMonth();
        const numDays = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay() || 7; // 1 (Mon) to 7 (Sun)
        
        const days = [];
        // Rellenar espacios vacíos al inicio
        for (let i = 1; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= numDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };



    const formatDayName = (date) => {
        return date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
    };

    const formatMonthName = () => {
        return new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="max-w-6xl mx-auto p-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Dashboard Administrativo</h2>
                <button onClick={activeTab === 'historial' ? fetchDatos : fetchUsuarios} className={`flex items-center gap-2 border shadow-sm px-4 py-2 rounded-lg transition ${isDarkMode ? 'bg-slate-800 border-slate-700 text-blue-400 hover:text-blue-300 hover:bg-slate-700' : 'bg-white text-blue-600 hover:text-blue-800 hover:bg-gray-50'}`}>
                    <RefreshCw size={18} className={(activeTab === 'historial' && loading) || (activeTab === 'usuarios' && loadingUsuarios) ? "animate-spin" : ""} /> Actualizar
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('historial')}
                    className={`pb-2 font-bold transition-colors ${activeTab === 'historial' ? (isDarkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700')}`}
                >
                    Historial de Accesos
                </button>
                <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`pb-2 font-bold transition-colors ${activeTab === 'usuarios' ? (isDarkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600') : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700')}`}
                >
                    Directorio de Usuarios
                </button>
            </div>

            {activeTab === 'historial' && (
                <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-6 rounded-xl shadow-sm border flex items-center gap-4 hover:shadow-md transition`}>
                    <div className={`p-4 ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'} rounded-full`}>
                        <Users size={24} />
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Estudiantes Adentro</p>
                        <h3 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{resumen.estudiantes_adentro}</h3>
                    </div>
                </div>
                <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-6 rounded-xl shadow-sm border flex items-center gap-4 hover:shadow-md transition`}>
                    <div className={`p-4 ${isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-50 text-green-600'} rounded-full`}>
                        <LogIn size={24} />
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Ingresos Hoy</p>
                        <h3 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{resumen.ingresos_hoy}</h3>
                    </div>
                </div>
                <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-6 rounded-xl shadow-sm border flex items-center gap-4 hover:shadow-md transition`}>
                    <div className={`p-4 ${isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-50 text-purple-600'} rounded-full`}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Registros (Filtro Actual)</p>
                        <h3 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{resumen.total_registros}</h3>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-4 rounded-xl shadow-sm border mb-6 flex flex-col md:flex-row justify-between items-center gap-4`}>
                <div className={`flex ${isDarkMode ? 'bg-slate-900' : 'bg-gray-100'} rounded-lg p-1 text-sm w-full md:w-auto overflow-x-auto`}>
                    {['hoy', 'semana', 'mes', 'todos'].map(rango => (
                        <button
                            key={rango}
                            onClick={() => setRangoFecha(rango)}
                            className={`px-6 py-2 rounded-md capitalize transition-colors ${rangoFecha === rango ? (isDarkMode ? 'bg-slate-700 shadow text-blue-400 font-bold' : 'bg-white shadow text-blue-600 font-bold') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-800')}`}
                        >
                            {rango}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-2.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, código o CC..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200'}`}
                    />
                </div>
            </div>

            {/* Sub-Filters: Semana o Mes */}
            {rangoFecha === 'semana' && (
                <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-4 rounded-xl shadow-sm border mb-6`}>
                    <p className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Filtrar por Día de la Semana</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {getWeekDays().map((date, i) => {
                            const dateStr = formatDateStr(date);
                            const isSelected = selectedDate === dateStr;
                            const isToday = formatDateStr(new Date()) === dateStr;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                    className={`flex-1 min-w-[80px] p-3 rounded-lg border transition text-center ${
                                        isSelected ? (isDarkMode ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-500 text-blue-700') : 
                                        (isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100')
                                    } ${isToday && !isSelected ? (isDarkMode ? 'ring-1 ring-slate-500' : 'ring-1 ring-blue-300') : ''}`}
                                >
                                    <div className="text-xs uppercase font-bold mb-1 opacity-70">{formatDayName(date)}</div>
                                    <div className="text-xl font-bold">{date.getDate()}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {rangoFecha === 'mes' && (
                <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-4 rounded-xl shadow-sm border mb-6`}>
                    <div className="flex justify-between items-center mb-4">
                        <p className={`text-sm font-bold capitalize ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{formatMonthName()}</p>
                        <button 
                            onClick={() => setSelectedDate(null)} 
                            className={`text-xs px-3 py-1 rounded-full border transition ${selectedDate ? (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600 border-slate-600' : 'bg-gray-100 hover:bg-gray-200') : 'opacity-50 cursor-not-allowed'}`}
                            disabled={!selectedDate}
                        >
                            Ver Todo el Mes
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                            <div key={`header-${i}`} className={`text-center text-xs font-bold py-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{d}</div>
                        ))}
                        {getMonthDays().map((date, i) => {
                            if (!date) return <div key={`empty-${i}`} className="p-2"></div>;
                            
                            const dateStr = formatDateStr(date);
                            const isSelected = selectedDate === dateStr;
                            const isToday = formatDateStr(new Date()) === dateStr;
                            
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                                    className={`p-2 rounded-md transition text-sm font-medium ${
                                        isSelected ? 'bg-blue-500 text-white shadow-md' : 
                                        isToday ? (isDarkMode ? 'bg-slate-700 text-blue-400 border border-slate-500' : 'bg-blue-50 text-blue-700 border border-blue-200') :
                                        (isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100')
                                    }`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} rounded-xl shadow-sm border overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className={`${isDarkMode ? 'bg-slate-900/50 text-slate-300 border-slate-700' : 'bg-gray-50 text-gray-600 border-gray-200'} text-sm border-b`}>
                                <th className="p-4 font-semibold">Estudiante</th>
                                <th className="p-4 font-semibold">CC / Carrera</th>
                                <th className="p-4 font-semibold">Fecha</th>
                                <th className="p-4 font-semibold">Hora de Ingreso</th>
                                <th className="p-4 font-semibold">Hora de Salida</th>
                                <th className="p-4 font-semibold">Estado Actual</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-100'}`}>
                            {loading && sesiones.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className={`p-12 text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Cargando reporte...</td>
                                </tr>
                            ) : sesiones.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className={`p-12 text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>No se encontraron registros para estos filtros.</td>
                                </tr>
                            ) : (
                                sesiones.map((sesion) => (
                                    <tr 
                                        key={sesion.id} 
                                        onClick={() => setSelectedSession(sesion)}
                                        className={`${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50'} transition-colors cursor-pointer group`}
                                    >
                                        <td className={`p-4 font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{sesion.estudiante}</td>
                                        <td className="p-4">
                                            <div className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{sesion.cc}</div>
                                            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{sesion.carrera}</div>
                                        </td>
                                        <td className={`p-4 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className={isDarkMode ? 'text-slate-500' : 'text-gray-400'}/> {sesion.fecha}
                                            </div>
                                        </td>
                                        <td className={`p-4 text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{sesion.hora_ingreso}</td>
                                        <td className={`p-4 text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                                            {sesion.hora_salida ? sesion.hora_salida : <span className={`italic font-normal ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>--:-- --</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                sesion.estado === 'Adentro' ? (isDarkMode ? 'bg-green-900/50 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200') : 
                                                sesion.estado.includes('Anomalía') ? (isDarkMode ? 'bg-red-900/50 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200') :
                                                (isDarkMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-gray-50 text-gray-700 border-gray-200')
                                            }`}>
                                                {sesion.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalles del Estudiante */}
            {selectedSession && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className={`${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'} rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative`}>
                        <button 
                            onClick={() => setSelectedSession(null)}
                            className={`absolute right-4 top-4 ${isDarkMode ? 'text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600' : 'text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200'} p-2 rounded-full transition z-10`}
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="p-6 md:p-8">
                            <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-6`}>Detalles del Registro</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4">
                                    <div>
                                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Estudiante</p>
                                        <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedSession.estudiante}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Documento (CC)</p>
                                            <p className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{selectedSession.cc}</p>
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Carrera</p>
                                            <p className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{selectedSession.carrera}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Correo Electrónico</p>
                                        <div className={`flex items-center gap-2 font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                                            <Mail size={16} className={isDarkMode ? 'text-slate-500' : 'text-gray-400'} /> {selectedSession.correo || 'No registrado'}
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-2 gap-4 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50/50 border-blue-100'} p-3 rounded-lg border`}>
                                        <div>
                                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Marca Dispositivo</p>
                                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedSession.marca || 'No especificada'}</p>
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Color Principal</p>
                                            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedSession.color || 'No especificado'}</p>
                                        </div>
                                    </div>
                                    <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border shadow-sm mt-4`}>
                                        <p className={`text-sm font-medium mb-3 border-b pb-2 ${isDarkMode ? 'text-slate-400 border-slate-700' : 'text-gray-500 border-gray-200'}`}>Línea de Tiempo del Día</p>
                                        <div className={`flex justify-between items-center mb-2 text-sm font-medium px-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                                            <span>Entrada</span>
                                            <span>Salida</span>
                                        </div>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                            {selectedSession.timeline && selectedSession.timeline.map((t, i) => (
                                                <div key={i} className={`flex justify-between items-center p-2 rounded border shadow-sm text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
                                                    <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{t.ingreso}</span>
                                                    <span className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{t.salida || '--:--'}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`flex justify-between items-center pt-3 mt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                                            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Estado Actual:</span>
                                            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedSession.estado}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-center items-center">
                                    <div className={`w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border-4 shadow-lg flex items-center justify-center relative group ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-white'}`}>
                                        {selectedSession.foto_estudiante ? (
                                            <img src={`${API_URL.replace('/api', '')}${selectedSession.foto_estudiante}`} alt="Estudiante" className="w-full h-full object-cover" />
                                        ) : (
                                            <Users size={64} className={isDarkMode ? 'text-slate-500' : 'text-gray-300'} />
                                        )}
                                        <div className="absolute bottom-0 w-full bg-black/60 text-white text-xs text-center py-1 opacity-0 group-hover:opacity-100 transition-opacity">Foto del Estudiante</div>
                                    </div>
                                </div>
                            </div>
                            
                            <h4 className={`text-lg font-bold mb-4 border-b pb-2 ${isDarkMode ? 'text-white border-slate-700' : 'text-gray-800 border-gray-200'}`}>Fotografías del Dispositivo</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'} p-2 rounded-xl border`}>
                                    <p className={`text-sm text-center font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Vista Frontal</p>
                                    <div className={`w-full h-48 rounded-lg overflow-hidden flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}>
                                        {selectedSession.foto_frontal ? (
                                            <img src={`${API_URL.replace('/api', '')}${selectedSession.foto_frontal}`} alt="Frontal" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <span className={`${isDarkMode ? 'text-slate-500' : 'text-gray-400'} text-sm`}>Sin foto frontal</span>
                                        )}
                                    </div>
                                </div>
                                <div className={`${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'} p-2 rounded-xl border`}>
                                    <p className={`text-sm text-center font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Vista Posterior / Serie</p>
                                    <div className={`w-full h-48 rounded-lg overflow-hidden flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}>
                                        {selectedSession.foto_respaldo ? (
                                            <img src={`${API_URL.replace('/api', '')}${selectedSession.foto_respaldo}`} alt="Posterior" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <span className={`${isDarkMode ? 'text-slate-500' : 'text-gray-400'} text-sm`}>Sin foto posterior</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </>
            )}

            {activeTab === 'usuarios' && (
                <>
                    {/* Toolbar Usuarios */}
                    <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-4 rounded-xl shadow-sm border mb-6 flex justify-between items-center gap-4`}>
                        <div className="relative w-full md:w-96">
                            <Search className={`absolute left-3 top-2.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar usuario por nombre, CC, código..." 
                                value={searchUsuario}
                                onChange={(e) => setSearchUsuario(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200'}`}
                            />
                        </div>
                    </div>

                    {/* Table Usuarios */}
                    <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} rounded-xl shadow-sm border overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className={`${isDarkMode ? 'bg-slate-900/50 text-slate-300 border-slate-700' : 'bg-gray-50 text-gray-600 border-gray-200'} text-sm border-b`}>
                                        <th className="p-4 font-semibold">Nombre Completo</th>
                                        <th className="p-4 font-semibold">CC / Documento</th>
                                        <th className="p-4 font-semibold">Código</th>
                                        <th className="p-4 font-semibold">Carrera</th>
                                        <th className="p-4 font-semibold text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingUsuarios ? (
                                        <tr>
                                            <td colSpan="5" className={`text-center p-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Cargando usuarios...</td>
                                        </tr>
                                    ) : usuarios.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className={`text-center p-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>No se encontraron usuarios.</td>
                                        </tr>
                                    ) : (
                                        usuarios.map((user) => (
                                            <tr key={user.cc} className={`border-b last:border-0 ${isDarkMode ? 'border-slate-700/50 hover:bg-slate-700/20' : 'border-gray-100 hover:bg-gray-50'} transition`}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        {user.foto_estudiante_url ? (
                                                            <img src={`${API_URL.replace('/api', '')}${user.foto_estudiante_url}`} alt="Foto" className="w-10 h-10 rounded-full object-cover border dark:border-slate-600" />
                                                        ) : (
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
                                                                {user.nombre_completo.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{user.nombre_completo}</p>
                                                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{user.correo_institucional}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`p-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{user.cc}</td>
                                                <td className={`p-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{user.codigo_estudiante}</td>
                                                <td className={`p-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{user.carrera || 'N/A'}</td>
                                                <td className="p-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button 
                                                            onClick={() => setEditingUser(user)}
                                                            className={`p-2 rounded-md transition ${isDarkMode ? 'bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white' : 'bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600'}`}
                                                            title="Editar Usuario"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteUser(user.cc)}
                                                            className={`p-2 rounded-md transition ${isDarkMode ? 'bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white' : 'bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600'}`}
                                                            title="Eliminar Usuario"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Modal Editar Usuario */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-xl w-full max-w-md border`}>
                        <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-slate-700">
                            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Editar Usuario</h3>
                            <button onClick={() => setEditingUser(null)} className={`p-2 rounded-full transition ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nombre Completo</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editingUser.nombre_completo}
                                    onChange={(e) => setEditingUser({...editingUser, nombre_completo: e.target.value})}
                                    className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Correo Institucional</label>
                                <input 
                                    type="email" 
                                    required
                                    value={editingUser.correo_institucional}
                                    onChange={(e) => setEditingUser({...editingUser, correo_institucional: e.target.value})}
                                    className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Carrera</label>
                                <input 
                                    type="text" 
                                    value={editingUser.carrera || ''}
                                    onChange={(e) => setEditingUser({...editingUser, carrera: e.target.value})}
                                    className={`w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                                />
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3 border-t mt-6 dark:border-slate-700">
                                <button type="button" onClick={() => setEditingUser(null)} className={`px-4 py-2 font-medium rounded-lg transition ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    Cancelar
                                </button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow flex items-center gap-2">
                                    <Save size={18} /> Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
