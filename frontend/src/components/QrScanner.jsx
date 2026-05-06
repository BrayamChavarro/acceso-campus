import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { BrowserQRCodeReader } from '@zxing/library';
import { Camera, CameraOff } from 'lucide-react';

const QrScanner = ({ onScanSuccess, isActive = true }) => {
    const webcamRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const codeReader = new BrowserQRCodeReader();

        const startScanning = () => {
            if (!isActive) return;
            
            if (webcamRef.current && webcamRef.current.video) {
                const videoElement = webcamRef.current.video;
                try {
                    codeReader.decodeFromVideoDevice(undefined, videoElement, (result, err) => {
                        if (result && isMounted) {
                            onScanSuccess(result.getText());
                        }
                    });
                } catch (e) {
                    console.error("Error al iniciar lector de video:", e);
                }
            } else if (isMounted) {
                // Reintentar si el tag de video aún no está listo
                setTimeout(startScanning, 500);
            }
        };

        if (isActive) {
            startScanning();
        }

        return () => {
            isMounted = false;
            // CRÍTICO: Detener el lector para evitar el crash al desmontar o detener
            codeReader.reset();
        };
    }, [onScanSuccess, isActive]);

    return (
        <div className="relative w-full bg-slate-900 overflow-hidden rounded-xl shadow-inner aspect-video flex flex-col items-center justify-center border-2 border-slate-700">
            {isActive ? (
                <>
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        videoConstraints={{ facingMode: "environment" }}
                        className="absolute inset-0 w-full h-full object-cover"
                        onUserMediaError={() => setError("Error dando permisos a la Cámara")}
                    />
                    {error && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white text-center p-4 z-20">
                            {error}
                        </div>
                    )}
                    <div className="absolute inset-x-8 inset-y-6 border-2 border-white/50 border-dashed rounded opacity-70 pointer-events-none z-10">
                         <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                             <span className="text-white/60 text-sm font-semibold tracking-wider bg-black/40 px-3 py-1 rounded">MOSTRAR QR PREF. IMPRESO</span>
                         </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <CameraOff size={48} className="mb-4 opacity-50" />
                    <p className="text-center px-4 font-medium">Cámara pausada</p>
                </div>
            )}
        </div>
    );
};

export default QrScanner;
