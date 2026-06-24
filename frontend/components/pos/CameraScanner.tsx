"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";

interface CameraScannerProps {
  onScanSuccess: (code: string) => void;
}

export default function CameraScanner({ onScanSuccess }: CameraScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [debugMsg, setDebugMsg] = useState("Cámara apagada");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "html5-camera-reader";

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      setDebugMsg("Iniciando cámara...");
      setIsScanning(true);
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15, // Incrementamos los frames para capturar más rápido
        // Forzamos una resolución más alta (HD) para que las líneas del código no se unan por pixelación
        videoConstraints: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "environment"
        },
        // Ajustamos la caja guía para que sea un rectangulo bien largo y delgado
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth * 0.8, 400);
          const height = 100; // Estrecho para códigos de barra
          return { width, height };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          setDebugMsg(`¡Código leído!: ${decodedText}`);
          onScanSuccess(decodedText); 
        },
        () => {
          // Callback interno por cada frame que no lee nada. 
          // Lo usamos para saber si el motor está vivo.
          setDebugMsg("Buscando código de barras en el recuadro...");
        }
      );
    } catch (err) {
      console.error("Error iniciando cámara:", err);
      setDebugMsg("Error al acceder a la cámara.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
        setDebugMsg("Cámara apagada");
      } catch (err) {
        console.error("Error deteniendo cámara:", err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center bg-white p-4 border rounded-2xl mb-4 shadow-sm">
      <div className="flex justify-between items-center w-full mb-3">
        <div>
          <span className="text-sm font-semibold text-gray-700 block">Cámara Escáner</span>
          <span className="text-xs text-gray-400 italic font-mono">{debugMsg}</span>
        </div>
        <button
          onClick={isScanning ? stopScanner : startScanner}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all ${
            isScanning ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isScanning ? (
            <>
              <CameraOff className="w-4 h-4" /> Apagar Cámara
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> Encender Cámara
            </>
          )}
        </button>
      </div>

      <div
        id={scannerId}
        className={`w-full overflow-hidden rounded-xl border bg-black transition-all ${
          isScanning ? "min-h-[250px] opacity-100" : "h-0 border-none opacity-0"
        }`}
      />
    </div>
  );
}