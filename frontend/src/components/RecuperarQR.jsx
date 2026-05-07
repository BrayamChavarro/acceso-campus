import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import QRCodeLib from 'react-qr-code';
const QRCode = QRCodeLib.default || QRCodeLib.QRCode || QRCodeLib;
import { AlertCircle, ArrowLeft, Download } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api`;

const RecuperarQR = () => {
    const [formData, setFormData] = useState({ documento_identidad: '', codigo_estudiante: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [qrData, setQrData] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setQrData(null);

        try {
            const res = await axios.post(`${API_URL}/estudiantes/recuperar_qr/`, formData);
            setQrData(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Error al recuperar el QR.");
        } finally {
            setLoading(false);
        }
    };

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
                link.download = `QR_Acceso_${formData.codigo_estudiante}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, "image/png");
        };
        img.src = svgUrl;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Recuperar Código QR</h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Ingresa tus datos para recuperar tu acceso.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-blue-500">
                    
                    {!qrData ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-400" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-red-700">
                                                {error}
                                            </p>
                                            {error.includes('registrado') && (
                                                <p className="text-sm mt-2">
                                                    <Link to="/registro" className="font-bold text-blue-600 hover:text-blue-500">Haz clic aquí para registrarte</Link>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Documento de Identidad (CC)</label>
                                <div className="mt-1">
                                    <input 
                                        type="text" 
                                        required 
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.documento_identidad}
                                        onChange={e => setFormData({...formData, documento_identidad: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Código de Estudiante</label>
                                <div className="mt-1">
                                    <input 
                                        type="text" 
                                        required 
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={formData.codigo_estudiante}
                                        onChange={e => setFormData({...formData, codigo_estudiante: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <button 
                                    type="submit" 
                                    disabled={loading || !formData.documento_identidad || !formData.codigo_estudiante}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                                >
                                    {loading ? 'Buscando...' : 'Buscar QR'}
                                </button>
                            </div>
                            
                            <div className="mt-4 text-center">
                                <Link to="/registro" className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1">
                                    <ArrowLeft size={16} /> Volver al Registro
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center text-center">
                            <h3 className="text-xl font-bold mb-2">¡Hola, {qrData.estudiante}!</h3>
                            <p className="text-gray-600 mb-6">Aquí tienes tu código de acceso.</p>
                            
                            <div id="qr-code-wrapper" className="bg-white p-4 shadow-lg border rounded-xl mb-6">
                                <QRCode value={qrData.codigo_qr} size={200} />
                            </div>
                            
                            <button onClick={downloadQR} className="w-full bg-green-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 shadow mb-4 transition">
                                <Download size={18} /> Descargar QR
                            </button>
                            
                            <button onClick={() => setQrData(null)} className="w-full bg-gray-100 text-gray-700 px-6 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition">
                                Buscar otro
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecuperarQR;
