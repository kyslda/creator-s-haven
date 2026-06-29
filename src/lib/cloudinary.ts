// Cliente público do Cloudinary — usa env vars publicáveis e um upload preset não-assinado.
// Configura no painel Cloudinary: Settings → Upload → Add upload preset → modo Unsigned.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

export type UploadedAsset = { url: string; type: "image" | "video"; publicId: string };

export function cloudinaryConfigured() {
  return !!CLOUD_NAME && !!UPLOAD_PRESET;
}

export async function uploadToCloudinary(file: File, onProgress?: (pct: number) => void): Promise<UploadedAsset> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary não configurado. Define VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env.");
  }
  const resourceType = file.type.startsWith("video") ? "video" : "image";
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const r = JSON.parse(xhr.responseText);
        resolve({ url: r.secure_url, type: resourceType, publicId: r.public_id });
      } else {
        reject(new Error("Upload falhou: " + xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("Erro de rede no upload"));
    xhr.send(form);
  });
}

export function blurredThumbnail(url: string) {
  // Insere transformações Cloudinary para criar preview desfocado
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/e_blur:2000,q_auto,w_600/");
}
