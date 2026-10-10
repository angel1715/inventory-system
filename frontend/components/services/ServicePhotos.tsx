"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Camera, Trash2, X, Upload } from "lucide-react";
import { uploadServicePhoto } from "@/lib/uploadImage";
import { removeServicePhoto } from "@/lib/api";

type PhotoType =
  | "RECEPTION"
  | "DIAGNOSIS"
  | "REPAIR"
  | "DELIVERY"
  | "WARRANTY"
  | "OTHER";

const TYPE_LABELS: Record<PhotoType, string> = {
  RECEPTION: "Recepción",
  DIAGNOSIS: "Diagnóstico",
  REPAIR: "Reparación",
  DELIVERY: "Entrega",
  WARRANTY: "Garantía",
  OTHER: "Otro",
};

interface ServicePhoto {
  id: string;
  imageUrl: string;
  type: PhotoType;
  description?: string | null;
  createdAt: string;
}

interface ServicePhotosProps {
  orderId: string;
  photos: ServicePhoto[];
  onChange: () => void; // recarga la orden (reusa tu loadOrder existente)
  disabled?: boolean; // ej. deshabilitar si la orden ya fue entregada
}

export default function ServicePhotos({
  orderId,
  photos,
  onChange,
  disabled,
}: ServicePhotosProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<PhotoType>("RECEPTION");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photos.length >= 5) {
      toast.error("Esta orden ya alcanzó el límite de 5 fotos.");
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);
      await uploadServicePhoto(file, orderId, selectedType);
      toast.success("Foto agregada");
      onChange();
    } catch (err: any) {
      toast.error(err?.message || "Error al subir la foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await removeServicePhoto(orderId, photoId);
      toast.success("Foto eliminada");
      onChange();
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar la foto");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-xl text-zinc-900 flex items-center gap-2">
          <Camera size={22} className="text-zinc-400" />
          Fotos del Equipo
        </h3>
        <span className="text-sm text-zinc-400">{photos.length}/5</span>
      </div>

      {/* Galería */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-2xl overflow-hidden border border-zinc-100 aspect-square"
            >
              <img
                src={photo.imageUrl}
                alt={TYPE_LABELS[photo.type]}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setPreviewUrl(photo.imageUrl)}
              />
              <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium">
                {TYPE_LABELS[photo.type]}
              </span>
              {!disabled && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-400 mb-6">No hay fotos registradas.</p>
      )}

      {/* Subida */}
      {!disabled && photos.length < 5 && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as PhotoType)}
            className="text-gray-700 border border-zinc-200 rounded-2xl px-4 py-3"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-2xl font-medium cursor-pointer transition">
            <Upload size={18} />
            {uploading ? "Subiendo..." : "Subir foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {/* Lightbox simple */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-6 right-6 text-white"
          >
            <X size={32} />
          </button>
          <img
            src={previewUrl}
            alt="Vista completa"
            className="max-w-full max-h-full rounded-2xl"
          />
        </div>
      )}
    </div>
  );
}