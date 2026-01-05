import { customAlphabet } from "nanoid";

// Alphanumeric without confusing characters (0, O, I, l)
const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nanoid = customAlphabet(alphabet, 8);

/**
 * Generate a unique reference ID for SEPA transfers
 * Format: GB-XXXXXXXX (max 35 chars for SEPA compliance)
 */
export function generateReferenceId(): string {
  return `GB-${nanoid()}`;
}
