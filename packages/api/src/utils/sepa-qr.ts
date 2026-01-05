import { z } from "zod";

export const SepaQrDataSchema = z.object({
  bic: z.string().optional(),
  name: z.string().max(70),
  iban: z.string(),
  amount: z.number().positive(),
  reference: z.string().max(35),
  currency: z.literal("EUR").default("EUR"),
});

export type SepaQrData = z.infer<typeof SepaQrDataSchema>;

/**
 * Generate an EPC QR code string for SEPA Credit Transfer
 * Spec: https://en.wikipedia.org/wiki/EPC_QR_code
 */
export function generateSepaQrString(data: SepaQrData): string {
  const lines = [
    "BCD", // Service Tag
    "002", // Version
    "1", // Character Set (UTF-8)
    "SCT", // Identification (SEPA Credit Transfer)
    data.bic ?? "", // BIC (optional)
    data.name, // Beneficiary Name
    data.iban.replace(/\s/g, ""), // IBAN (no spaces)
    `EUR${data.amount.toFixed(2)}`, // Amount
    "", // Purpose (empty)
    data.reference, // Remittance Reference
    "", // Remittance Text (alternative to reference)
    "", // Beneficiary to originator info
  ];

  return lines.join("\n");
}

/**
 * Format cents to euros for QR code
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}
