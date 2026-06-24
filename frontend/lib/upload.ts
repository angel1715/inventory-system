import axios from "axios";

export async function uploadImage(file: File) {
    const formData = new FormData();

    formData.append("file", file);

    formData.append(
        "upload_preset",
        "inventory_upload"
    );

    const cloudName = "draqbcimj";

    const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
    );

    return res.data.secure_url;
}