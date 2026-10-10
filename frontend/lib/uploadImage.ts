// lib/uploadImage.ts
import { addServicePhoto } from "@/lib/api";

export async function uploadImage(file: File) {
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
        throw new Error("Faltan variables de entorno de Cloudinary");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!res.ok) {
        const errorData = await res.json();
        console.error("Error de Cloudinary:", errorData);
        throw new Error("Fallo al subir imagen a Cloudinary");
    }

    const data = await res.json();
    return data.secure_url;
}

// ==========================================
// NUEVO: sube la foto a Cloudinary Y la registra
// en la orden de reparación, en un solo paso.
// ==========================================
export async function uploadServicePhoto(
    file: File,
    serviceOrderId: string,
    type: "RECEPTION" | "DIAGNOSIS" | "REPAIR" | "DELIVERY" | "WARRANTY" | "OTHER",
    description?: string
) {
    const imageUrl = await uploadImage(file);

    return addServicePhoto(serviceOrderId, {
        imageUrl,
        type,
        description,
    });
}