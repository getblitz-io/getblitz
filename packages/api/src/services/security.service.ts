import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { env } from "../env";

export class SecurityService {
  private key: Buffer;

  constructor(encryptionKey?: string) {
    const key = encryptionKey ?? env.ENCRYPTION_KEY;
    // Key must be 32 bytes (64 hex chars)
    if (key.length !== 64) {
      throw new Error(
        "ENCRYPTION_KEY must be a 32-byte hex string (64 characters)",
      );
    }
    this.key = Buffer.from(key, "hex");
  }

  encrypt({ text }: { text: string }): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    // Format: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  }

  decrypt({ text }: { text: string }): string {
    const parts = text.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error("Invalid encrypted components");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
