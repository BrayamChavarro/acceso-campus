import React, { useState, useCallback, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import axios from 'axios'
import { QrCode, LogOut, Search, CheckCircle, XCircle, Camera, Keyboard, ClipboardCheck, ArrowRight, User, Moon, Sun } from 'lucide-react'
import QrScanner from './components/QrScanner'
import RegistroEstudiante from './components/RegistroEstudiante'
import RecuperarQR from './components/RecuperarQR'
import RegistroVisitante from './components/RegistroVisitante'

import AdminDashboard from './components/AdminDashboard'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const API_URL = `${API_BASE}/api`

function ControlAcceso() {
  const [token, setToken] = useState(null)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [codigoQr, setCodigoQr] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [errorInfo, setErrorInfo] = useState(null)
  const [isSuperuser, setIsSuperuser] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  
  const [modoEscaneo, setModoEscaneo] = useState('camara')
  const [vistaActiva, setVistaActiva] = useState('escaner')

  useEffect(() => {
    const horaActual = new Date().getHours()
    if (horaActual >= 18 || horaActual < 6) {
        setIsDarkMode(true)
    }
  }, [])

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gainNode2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
        gainNode2.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc2.connect(gainNode2);
        gainNode2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.1);
      }, 120);
    } catch(e) {}
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  };

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
        const res = await axios.post(`${API_URL}/token/`, { username, password })
        const accessToken = res.data.access
        setToken(accessToken)
        setErrorInfo(null)
        
        try {
            const roleRes = await axios.get(`${API_URL}/auth/me/`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            })
            setIsSuperuser(roleRes.data.is_superuser)
            if (!roleRes.data.is_superuser) setVistaActiva('escaner')
        } catch(e) { console.error(e) }
        
    } catch (error) {
        setErrorInfo("Error autenticando. Verifica.")
    }
  }

  const ejecutarRegistro = async (codigoCapturado) => {
    if (!codigoCapturado) return
    setLoading(true); setErrorInfo(null); setResultado(null)
    
    try {
        const res = await axios.post(
            `${API_URL}/dispositivos/registrar_escaneo/`,
            { codigo_qr: codigoCapturado },
            { headers: { Authorization: `Bearer ${token}` } }
        )
        setResultado(res.data)
        setCodigoQr('')
        playSuccessSound()
    } catch (error) {
        if (error.response?.status === 404) setErrorInfo(`Dispositivo asociado al código ${codigoCapturado} no encontrado.`)
        else setErrorInfo("Error registrando escaneo.")
        playErrorSound()
    } finally {
        setLoading(false)
    }
  }

  const onCamaraSuccess = useCallback((codigoCapturado) => {
      if(!loading && !resultado && !errorInfo) {
          ejecutarRegistro(codigoCapturado)
      }
  }, [loading, resultado, errorInfo, token])

  const registrarEscaneoManual = (e) => {
    e.preventDefault()
    ejecutarRegistro(codigoQr)
  }

  const limpiarYContinuar = () => {
      setResultado(null)
      setErrorInfo(null)
      setCodigoQr('')
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"></div>
        </div>

        <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative z-10 flex flex-col items-center">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <QrCode size={40} className="text-white"/>
          </div>
          <h2 className="text-3xl font-extrabold mb-1 text-center text-white tracking-tight">Acceso Administrativo</h2>
          <p className="text-blue-200/80 mb-8 text-center text-sm">Control de Ingreso y Salida Campus</p>
          
          <div className="w-full space-y-5">
              <div>
                  <label className="block text-blue-200/70 text-xs font-bold mb-2 uppercase tracking-wider">Usuario</label>
                  <input className="w-full p-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Ej: admin" />
              </div>
              <div>
                  <label className="block text-blue-200/70 text-xs font-bold mb-2 uppercase tracking-wider">Contraseña</label>
                  <input className="w-full p-4 bg-black/20 border border-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
              </div>
          </div>
          
          {errorInfo && <div className="mt-5 text-red-300 text-sm font-medium bg-red-900/40 p-3 rounded-lg w-full text-center border border-red-500/20 flex items-center justify-center gap-2"><XCircle size={16}/> {errorInfo}</div>}
          
          <button className="w-full bg-blue-600 text-white p-4 rounded-xl mt-8 font-bold text-lg hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex justify-center items-center gap-2 group">
              Iniciar Sesión <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-black'}`}>
      <nav className={`${isDarkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-slate-900'} text-white shadow-md transition-colors`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg shadow-inner">
                  <QrCode size={20} className="text-white"/>
                </div>
                <span className="text-xl font-bold tracking-wide">AccesoCampus</span>
              </div>
              <div className="hidden md:flex space-x-2">
                <button 
                  onClick={() => setVistaActiva('escaner')}
                  className={`px-4 py-2 rounded-md font-medium transition ${vistaActiva === 'escaner' ? 'bg-slate-800 text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    Escáner de Acceso
                </button>
                <button 
                  onClick={() => setVistaActiva('visitante')}
                  className={`px-4 py-2 rounded-md font-medium transition ${vistaActiva === 'visitante' ? 'bg-slate-800 text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    Ingreso Visitante
                </button>
                {isSuperuser && (
                  <button 
                    onClick={() => setVistaActiva('dashboard')}
                    className={`px-4 py-2 rounded-md font-medium transition ${vistaActiva === 'dashboard' ? 'bg-slate-800 text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                      Dashboard Administrativo
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsDarkMode(!isDarkMode)} 
                 className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition"
                 title="Alternar Modo Oscuro"
               >
                 {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
               </button>
               <div className="text-sm text-slate-300 hidden sm:block">
                  Sesión activa: <span className="font-bold text-white capitalize">{username}</span>
               </div>
               <button onClick={()=>setToken(null)} className="flex items-center gap-2 bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white px-4 py-2 rounded-md transition text-sm font-medium">
                 <LogOut size={16}/> Salir
               </button>
            </div>
          </div>
          {/* Mobile menu */}
          <div className="md:hidden flex overflow-x-auto pb-3 space-x-2">
              <button 
                onClick={() => setVistaActiva('escaner')}
                className={`px-3 py-1.5 text-sm rounded-md transition ${vistaActiva === 'escaner' ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
                  Escáner
              </button>
              <button 
                onClick={() => setVistaActiva('visitante')}
                className={`px-3 py-1.5 text-sm rounded-md transition ${vistaActiva === 'visitante' ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
                  Visitante
              </button>
              {isSuperuser && (
                  <button 
                    onClick={() => setVistaActiva('dashboard')}
                    className={`px-3 py-1.5 text-sm rounded-md transition ${vistaActiva === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300'}`}>
                      Dashboard
                  </button>
              )}
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 py-8 max-w-7xl mx-auto w-full">
      {vistaActiva === 'escaner' ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'} p-6 shadow-md border-t-4 border-blue-500 rounded-xl transition-colors`}>
              <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Capturar Código de Portátil</h3>
                  <div className={`flex ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-200'} rounded-lg p-1 text-sm border shadow-inner`}>
                      <button 
                        onClick={() => setModoEscaneo('camara')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${modoEscaneo === 'camara' ? (isDarkMode ? 'bg-slate-700 shadow text-blue-400 font-medium' : 'bg-white shadow text-blue-600 font-medium') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')}`}>
                          <Camera size={14}/> Cámara
                      </button>
                      <button 
                        onClick={() => setModoEscaneo('manual')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${modoEscaneo === 'manual' ? (isDarkMode ? 'bg-slate-700 shadow text-blue-400 font-medium' : 'bg-white shadow text-blue-600 font-medium') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700')}`}>
                          <Keyboard size={14}/> Manual
                      </button>
                  </div>
              </div>

              <div className="mb-4">
                {modoEscaneo === 'camara' ? (
                    <div className="relative">
                        <QrScanner onScanSuccess={onCamaraSuccess} isActive={!(resultado || errorInfo)} />
                        {(resultado || errorInfo) && (
                            <div className={`absolute inset-0 ${isDarkMode ? 'bg-slate-900/60' : 'bg-white/60'} backdrop-blur-sm z-30 flex flex-col items-center justify-center rounded`}>
                                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-700'} mb-2`}>Escaneo Pausado</span>
                                <button onClick={limpiarYContinuar} className="bg-blue-600 text-white px-4 py-2 rounded shadow">
                                    Escanear Siguiente
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={registrarEscaneoManual}>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                className={`w-full pl-10 p-2 border rounded focus:ring-2 focus:border-blue-500 outline-none transition ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white'}`}
                                type="text" 
                                value={codigoQr} 
                                onChange={e => setCodigoQr(e.target.value)} 
                                placeholder="Ej: 20261001 (Código de estudiante)" 
                                autoFocus 
                            />
                        </div>
                        <button type="submit" disabled={loading || !codigoQr} className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50">
                            {loading ? 'Cargando...' : 'Registrar'}
                        </button>
                    </form>
                )}
              </div>
              
              {errorInfo && <div className="mt-4 bg-red-50 text-red-600 p-3 rounded text-sm flex gap-2"><XCircle size={18}/> {errorInfo}</div>}
            </div>

             {resultado ? (
                <div className={`relative overflow-hidden p-6 md:p-8 shadow-xl ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'} rounded-2xl border-t-[10px] ${resultado.nuevo_estado==='ADENTRO'?'border-green-500':'border-orange-500'} flex flex-col justify-between`}>
                    
                    <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-10 ${resultado.nuevo_estado==='ADENTRO'?'bg-green-500':'bg-orange-500'} pointer-events-none`}></div>
                    
                    <div className="relative z-10">
                      <h2 className={`text-3xl font-extrabold mb-6 flex items-center gap-3 ${resultado.nuevo_estado==='ADENTRO'?'text-green-500':'text-orange-500'}`}>
                          <CheckCircle size={36}/> 
                          {resultado.nuevo_estado === 'ADENTRO' ? 'ENTRADA' : 'SALIDA'} AUTORIZADA
                      </h2>
                      
                      <div className={`mt-2 ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gradient-to-br from-blue-50 to-white border-blue-100'} p-6 rounded-2xl border shadow-sm`}>
                          <div className="flex gap-6 items-center">
                              {resultado.estudiante.foto_estudiante_url ? (
                                  <img src={`${API_BASE}${resultado.estudiante.foto_estudiante_url}`} alt="Estudiante" className={`w-28 h-28 object-cover rounded-full shadow-md border-4 ${isDarkMode ? 'border-slate-800' : 'border-white'}`} />
                              ) : (
                                  <div className={`w-28 h-28 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'} rounded-full flex items-center justify-center text-gray-400 shadow-inner border-4 ${isDarkMode ? 'border-slate-700' : 'border-white'}`}>
                                      <User size={40} />
                                  </div>
                              )}
                              <div className="flex-1">
                                  <span className={`text-xs tracking-wider uppercase ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} font-bold block mb-1`}>Estudiante Verificado</span>
                                  <strong className={`text-2xl ${isDarkMode ? 'text-white' : 'text-gray-800'} block leading-tight mb-2`}>{resultado.estudiante.nombre_completo}</strong>
                                  <div className={`flex flex-wrap items-center gap-2 mb-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      <span className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} px-3 py-1 rounded-full border shadow-sm font-medium`}>{resultado.estudiante.documento_identidad}</span>
                                      <span className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} px-3 py-1 rounded-full border shadow-sm font-medium`}>{resultado.estudiante.codigo_estudiante}</span>
                                  </div>
                                  <div className={`text-sm flex flex-col gap-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {resultado.estudiante.carrera && <span className="flex items-center gap-2"><ClipboardCheck size={16} className="text-gray-400"/> {resultado.estudiante.carrera}</span>}
                                      <span className="flex items-center gap-2"><User size={16} className="text-gray-400"/> {resultado.estudiante.correo_institucional}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className={`mt-6 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50/80 border-gray-200'} p-5 rounded-2xl border`}>
                          <div className="flex justify-between items-center mb-4">
                              <span className={`text-sm uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-bold flex items-center gap-2`}>
                                  <Camera size={16}/> Dispositivo Registrado
                              </span>
                              <span className={`text-xs ${isDarkMode ? 'bg-slate-800 text-gray-300 border-slate-700' : 'bg-white text-gray-700 border-gray-200'} border px-3 py-1 rounded-full font-mono shadow-sm`}>ID: {resultado.dispositivo.codigo_qr.substring(0,8)}...</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              {resultado.dispositivo.foto_frontal_url && (
                                  <div className={`group relative overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                                      <div className="absolute top-0 left-0 w-full bg-gradient-to-b from-black/60 to-transparent p-2 z-10">
                                          <span className="text-white text-xs font-medium">Vista Frontal</span>
                                      </div>
                                      <img src={`${API_BASE}${resultado.dispositivo.foto_frontal_url}`} alt="Frontal" className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110" />
                                  </div>
                              )}
                              {resultado.dispositivo.foto_respaldo_url && (
                                  <div className={`group relative overflow-hidden rounded-xl border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} shadow-sm`}>
                                      <div className="absolute top-0 left-0 w-full bg-gradient-to-b from-black/60 to-transparent p-2 z-10">
                                          <span className="text-white text-xs font-medium">Vista Respaldo</span>
                                      </div>
                                      <img src={`${API_BASE}${resultado.dispositivo.foto_respaldo_url}`} alt="Respaldo" className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110" />
                                  </div>
                              )}
                          </div>
                      </div>
                    </div>
                    
                    <button onClick={limpiarYContinuar} className="relative z-10 mt-8 w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-lg">
                        Confirmar y Continuar <ArrowRight size={20}/>
                    </button>
                </div>
            ) : (
                <div className={`flex items-center justify-center ${isDarkMode ? 'bg-slate-800/50 border-slate-700 text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-400'} border-dashed border-2 rounded p-8 transition-colors`}>
                    Escanea dispositivo...
                </div>
            )}
          </div>
      ) : vistaActiva === 'dashboard' ? (
          <AdminDashboard token={token} isDarkMode={isDarkMode} />
      ) : (
          <RegistroVisitante token={token} isDarkMode={isDarkMode} />
      )}
      </main>
    </div>
  )
}

function StudentRegistrationPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800">Registro de Portátil - Estudiante</h1>
                <p className="text-gray-600 mt-2">Diligencia la información y captura las fotos solicitadas para registrar tu dispositivo y obtener el código QR de acceso.</p>
                <div className="mt-4">
                    <Link to="/recuperar-qr" className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                        ¿Perdiste tu QR? Recupéralo aquí
                    </Link>
                </div>
            </div>
            <RegistroEstudiante />
        </div>
    )
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<ControlAcceso />} />
            <Route path="/registro" element={<StudentRegistrationPage />} />
            <Route path="/recuperar-qr" element={<RecuperarQR />} />
        </Routes>
    )
}

export default App
