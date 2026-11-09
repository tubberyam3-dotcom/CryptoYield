import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_VERIFICATION_BYTES, registrationDetailsSchema, registrationDetailsToUser, verificationDocumentSchema } from "../shared/registrationDetails";
import { readVerificationDocument, verificationDocumentExtension } from "../client/src/lib/verificationDocuments";

const image = "data:image/png;base64,iVBORw0KGgo=";
const pdf = "data:application/pdf;base64,JVBERi0xLjQK";
const details = {
  phone: "+10000000000", country: "US", address: "123 Test Street",
  city: "Test City", state: "Test State", zipCode: "00000",
  documentType: "passport" as const, documentNumber: "TEST-DOCUMENT",
  verificationDocumentUrl: image,
};

test("registration validation retains contact, address and document fields for storage", () => {
  const parsed = registrationDetailsSchema.parse({ ...details, role: "admin", balance: "5000" });
  assert.deepEqual(registrationDetailsToUser(parsed), {
    phoneNumber: details.phone, country: details.country, address: details.address,
    city: details.city, state: details.state, zipCode: details.zipCode,
    verificationDocumentType: details.documentType, verificationDocumentNumber: details.documentNumber,
    verificationDocumentUrl: image,
  });
  assert.equal("role" in parsed, false);
  assert.equal("balance" in parsed, false);
  assert.equal(registrationDetailsToUser(registrationDetailsSchema.parse({})).address, null);
});

test("verification uploads allow images/PDFs up to 5MB and reject unsafe or malformed input", () => {
  for (const document of [image, pdf]) assert.equal(verificationDocumentSchema.parse(document), document);
  const maximum = `data:image/png;base64,${Buffer.alloc(MAX_VERIFICATION_BYTES).toString("base64")}`;
  assert.equal(verificationDocumentSchema.safeParse(maximum).success, true);
  for (const document of [
    "data:image/svg+xml;base64,PHN2Zz4=",
    "javascript:alert(1)", "https://example.test/document.png",
    "data:image/png;base64,not base64",
    `data:image/png;base64,${Buffer.alloc(MAX_VERIFICATION_BYTES + 1).toString("base64")}`,
  ]) assert.equal(verificationDocumentSchema.safeParse(document).success, false);
  assert.equal(verificationDocumentExtension(image), "png");
  assert.equal(verificationDocumentExtension(pdf), "pdf");
});

test("signup converts the selected file into the document payload and reports read failures", async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "FileReader");
  class TestReader {
    result: string | null = null;
    onload?: () => void;
    onerror?: () => void;
    readAsDataURL(file: File) {
      file.arrayBuffer().then(bytes => {
        this.result = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;
        this.onload?.();
      }, () => this.onerror?.());
    }
  }
  Object.defineProperty(globalThis, "FileReader", { configurable: true, value: TestReader });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "FileReader", original);
    else Reflect.deleteProperty(globalThis, "FileReader");
  });
  const file = { type: "image/png", size: 8, arrayBuffer: async () => Buffer.from("iVBORw0KGgo=", "base64") } as unknown as File;
  assert.equal(await readVerificationDocument(file), image);
  await assert.rejects(readVerificationDocument({ ...file, type: "image/svg+xml" }), /image or PDF/);
  await assert.rejects(readVerificationDocument({ ...file, size: MAX_VERIFICATION_BYTES + 1 }), /5MB/);
  await assert.rejects(readVerificationDocument({ ...file, arrayBuffer: async () => { throw new Error("Read failed"); } }), /Unable to read/);
});
