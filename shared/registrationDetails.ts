import { z } from "zod";

export const MAX_VERIFICATION_BYTES = 5 * 1024 * 1024;
export const VERIFICATION_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

export const verificationDocumentSchema = z.string().max(7 * 1024 * 1024, "Document must be 5MB or smaller.")
  .refine(value => {
    const match = /^data:(image\/(?:jpeg|jpg|png|gif|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[2].length % 4 !== 0) return false;
    const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
    return match[2].length * 3 / 4 - padding <= MAX_VERIFICATION_BYTES;
  }, "Upload a valid image or PDF document, 5MB or smaller.");

export const registrationDetailsSchema = z.object({
  phone: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  zipCode: z.string().trim().max(30).optional(),
  documentType: z.enum(["passport", "drivers_license", "national_id", "other", ""]).optional(),
  documentNumber: z.string().max(150).optional(),
  verificationDocumentUrl: verificationDocumentSchema.optional(),
});

export function registrationDetailsToUser(data: z.infer<typeof registrationDetailsSchema>) {
  return {
    phoneNumber: data.phone || null,
    country: data.country || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zipCode || null,
    verificationDocumentType: data.documentType || null,
    verificationDocumentNumber: data.documentNumber || null,
    verificationDocumentUrl: data.verificationDocumentUrl || null,
  };
}
