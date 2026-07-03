// lib/uploadImage.ts
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