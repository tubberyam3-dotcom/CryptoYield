import { MAX_VERIFICATION_BYTES, VERIFICATION_MIME_TYPES } from "@shared/registrationDetails";

export function readVerificationDocument(file: File): Promise<string> {
  if (!VERIFICATION_MIME_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_VERIFICATION_BYTES) {
    return Promise.reject(new Error("Upload an image or PDF document, 5MB or smaller."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result) : reject(new Error("Unable to read document. Please select it again."));
    reader.onerror = reader.onabort = () => reject(new Error("Unable to read document. Please select it again."));
    reader.readAsDataURL(file);
  });
}

export function verificationDocumentLink(url: string) {
  if (!url.startsWith("data:")) return url;
  const [header, encoded] = url.split(",");
  const mime = header.match(/^data:([^;]+);base64$/)?.[1];
  if (!mime || !encoded) throw new Error("Invalid verification document.");
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  // Keep it alive long enough for a new tab or download to consume it.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  return blobUrl;
}

export function verificationDocumentExtension(url: string) {
  if (/^data:application\/pdf;|\.pdf(?:[?#]|$)/i.test(url)) return "pdf";
  return url.match(/^data:image\/(jpeg|jpg|png|gif|webp);/i)?.[1] || "jpg";
}
