import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import QRCodeLib from 'react-qr-code';
const QRCode = QRCodeLib.default || QRCodeLib.QRCode || QRCodeLib;
import axios from 'axios';
import { Camera, CheckCircle, ChevronRight, ChevronLeft, QrCode, Download, RefreshCw } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api`;

const RegistroEstudiante = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successData, setSuccessData] = useState(null);

    const [formData, setFormData] = useState({
        documento_identidad: '',
        codigo_estudiante: '',
        nombre_completo: '',
        correo_institucional: '',
        carrera: '',
        marca: '',
        color: '',
        foto_estudiante: null,
        foto_frontal: null,
        foto_respaldo: null,
    });

    const webcamRef = useRef(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' = frontal, 'environment' = trasera

    const toggleCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user');

    const capture = useCallback((field) => {
        const imageSrc = webcamRef.current.getScreenshot();
        setFormData(prev => ({ ...prev, [field]: imageSrc }));
    }, [webcamRef]);

    const handleNext = () => setStep(prev => prev + 1);
    const handlePrev = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post(
                `${API_URL}/estudiantes/registro_completo/`,
                formData
            );
            setSuccessData(response.data);
            setStep(6); // Pantalla final
        } catch (err) {
            setError(err.response?.data?.error || "Error registrando estudiante.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSuccessData(null);
        setFormData({
            documento_identidad: '',
            codigo_estudiante: '',
            nombre_completo: '',
            correo_institucional: '',
            carrera: '',
            foto_estudiante: null,
            foto_frontal: null,
            foto_respaldo: null,
        });
    };

    const renderWebcamStep = (field, title, description) => (
        <div className="flex flex-col items-center">
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-600 mb-4 text-center">{description}</p>
            
            {formData[field] ? (
                <div className="relative mb-4">
                    <img src={formData[field]} alt={title} className="rounded-lg shadow-md border w-full max-w-md" />
                    <button 
                        onClick={() => setFormData(prev => ({ ...prev, [field]: null }))}
                        className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 text-sm rounded-full shadow hover:bg-red-600"
                    >
                        Retomar
                    </button>
                </div>
            ) : (
                <div className="mb-4 w-full max-w-md">
                    <div className="relative bg-black rounded-lg overflow-hidden shadow-md">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode }}
                            className="w-full"
                            mirrored={facingMode === 'user'}
                        />
                        {/* Botón voltear cámara */}
                        <button
                            onClick={toggleCamera}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full shadow-lg transition"
                            title={facingMode === 'user' ? 'Cambiar a cámara trasera' : 'Cambiar a cámara frontal'}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                            {facingMode === 'user' ? '📱 Cámara frontal' : '📷 Cámara trasera'}
                        </div>
                    </div>
                </div>
            )}

            {!formData[field] ? (
                <button onClick={() => capture(field)} className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                    <Camera size={18}/> Capturar Foto
                </button>
            ) : (
                <div className="flex gap-4">
                    <button onClick={handlePrev} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">Atrás</button>
                    {step < 4 ? (
                        <button onClick={handleNext} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Siguiente</button>
                    ) : (
                        <button onClick={handleNext} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Continuar</button>
                    )}
                </div>
            )}
        </div>
    );

    const downloadQR = () => {
        const wrapper = document.getElementById("qr-code-wrapper");
        if (!wrapper) return;
        const svg = wrapper.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            // Renderizar en canvas con margen blanco
            const padding = 24;
            const canvas = document.createElement("canvas");
            canvas.width  = img.width  + padding * 2;
            canvas.height = img.height + padding * 2;

            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding);

            URL.revokeObjectURL(svgUrl);

            canvas.toBlob((blob) => {
                const url  = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href     = url;
                link.download = `QR_Acceso_${formData.codigo_estudiante || 'estudiante'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, "image/png");
        };
        img.src = svgUrl;
    };

    return (
        <div className="bg-white p-6 shadow-md border-t-4 border-blue-500 rounded max-w-2xl mx-auto">
            {/* ProgressBar */}
            {step < 6 && (
                <div className="mb-8 flex justify-between items-center relative px-2">
                    <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2"></div>
                    <div className="absolute left-0 top-1/2 h-1 bg-blue-500 -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= s ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-gray-500'}`}>
                            {s}
                        </div>
                    ))}
                </div>
            )}

            {error && <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">{error}</div>}

            {step === 1 && (
                <div>
                    <h3 className="text-xl font-bold mb-4">Datos del Estudiante</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input className="border p-2 rounded focus:ring-2 outline-none" placeholder="Documento de Identidad (CC)" value={formData.documento_identidad} onChange={e => setFormData({...formData, documento_identidad: e.target.value})} />
                        <input className="border p-2 rounded focus:ring-2 outline-none" placeholder="Código de Estudiante" value={formData.codigo_estudiante} onChange={e => setFormData({...formData, codigo_estudiante: e.target.value})} />
                        <input className="border p-2 rounded focus:ring-2 outline-none md:col-span-2" placeholder="Nombre Completo" value={formData.nombre_completo} onChange={e => setFormData({...formData, nombre_completo: e.target.value})} />
                        <input className="border p-2 rounded focus:ring-2 outline-none" type="email" placeholder="Correo Institucional" value={formData.correo_institucional} onChange={e => setFormData({...formData, correo_institucional: e.target.value})} />
                        <select 
                            className={`border p-2 rounded focus:ring-2 outline-none bg-white ${!formData.carrera ? 'text-gray-500' : 'text-black'}`}
                            value={formData.carrera} 
                            onChange={e => setFormData({...formData, carrera: e.target.value})}
                        >
                            <option value="" disabled>Selecciona tu Carrera (Opcional)</option>
                            <option value="Administración de Empresas" className="text-black">Administración de Empresas</option>
                            <option value="Ingeniería de Software" className="text-black">Ingeniería de Software</option>
                            <option value="Ingeniería Industrial" className="text-black">Ingeniería Industrial</option>
                            <option value="Marketing" className="text-black">Marketing</option>
                            <option value="Finanzas y Comercio Exterior" className="text-black">Finanzas y Comercio Exterior</option>
                            <option value="Negocios Internacionales" className="text-black">Negocios Internacionales</option>
                            <option value="Gestión del Talento Humano" className="text-black">Gestión del Talento Humano</option>
                            <option value="Gestión de la Producción Industrial" className="text-black">Gestión de la Producción Industrial</option>
                            <option value="Gestión Comercial" className="text-black">Gestión Comercial</option>
                        </select>
                    </div>
                    <h3 className="text-xl font-bold mb-4 mt-6">Datos del Dispositivo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input className="border p-2 rounded focus:ring-2 outline-none" placeholder="Marca (Ej: Lenovo, Apple, HP...)" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} />
                        <input className="border p-2 rounded focus:ring-2 outline-none" placeholder="Color Principal (Ej: Negro, Gris...)" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                    </div>
                    <div className="flex justify-end">
                        <button 
                            onClick={handleNext} 
                            disabled={!formData.documento_identidad || !formData.codigo_estudiante || !formData.nombre_completo || !formData.correo_institucional}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            Siguiente <ChevronRight size={18}/>
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && renderWebcamStep('foto_estudiante', 'Foto del Estudiante', 'Asegúrate de que el rostro sea claramente visible.')}
            {step === 3 && renderWebcamStep('foto_frontal', 'Foto Frontal del Dispositivo', 'Captura el teclado y la pantalla del portátil.')}
            {step === 4 && renderWebcamStep('foto_respaldo', 'Foto Trasera del Dispositivo', 'Asegúrate de que los stickers o placas de serie sean legibles.')}

            {step === 5 && (
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-4">Resumen de Registro</h3>
                    <div className="bg-gray-50 p-4 rounded mb-6 text-left border">
                        <p><strong>Nombre:</strong> {formData.nombre_completo}</p>
                        <p><strong>CC:</strong> {formData.documento_identidad}</p>
                        <p><strong>Código:</strong> {formData.codigo_estudiante}</p>
                        <p><strong>Correo:</strong> {formData.correo_institucional}</p>
                        <p><strong>Marca:</strong> {formData.marca || 'No especificada'}</p>
                        <p><strong>Color:</strong> {formData.color || 'No especificado'}</p>
                        <div className="mt-4 flex gap-2 justify-center">
                            <img src={formData.foto_estudiante} className="w-20 h-20 object-cover rounded border" alt="Estudiante" />
                            <img src={formData.foto_frontal} className="w-20 h-20 object-cover rounded border" alt="Frontal" />
                            <img src={formData.foto_respaldo} className="w-20 h-20 object-cover rounded border" alt="Respaldo" />
                        </div>
                    </div>
                    <div className="flex justify-center gap-4">
                        <button onClick={handlePrev} className="bg-gray-300 px-6 py-2 rounded-lg hover:bg-gray-400">Atrás</button>
                        <button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
                            {loading ? 'Guardando...' : <><CheckCircle size={18}/> Confirmar y Registrar</>}
                        </button>
                    </div>
                </div>
            )}

            {step === 6 && successData && (
                <div className="flex flex-col items-center text-center py-8">
                    <div className="text-green-500 mb-4"><CheckCircle size={64} /></div>
                    <h2 className="text-2xl font-bold mb-2">¡Registro Exitoso!</h2>
                    <p className="text-gray-600 mb-6">El dispositivo ha sido registrado en el sistema.</p>
                    
                    <div id="qr-code-wrapper" className="bg-white p-4 shadow-lg border rounded-xl mb-6">
                        {successData.codigo_qr ? (
                            <QRCode value={successData.codigo_qr} size={200} />
                        ) : (
                            <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 text-gray-400">QR No Disponible</div>
                        )}
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-6 max-w-sm">
                        Este es el código QR único para el dispositivo. Por favor, imprime este código y pégalo en el dispositivo, o guárdalo digitalmente.
                    </p>

                    <div className="flex gap-4">
                        <button onClick={downloadQR} className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow">
                            <Download size={18} /> Descargar QR
                        </button>
                        <button onClick={resetForm} className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow">
                            <QrCode size={18} /> Nuevo Registro
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegistroEstudiante;
