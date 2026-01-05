import * as QRCode from "qrcode";

import type { PaymentSessionDetails } from "../types";

/**
 * Generates an EPC QR code string for SEPA bank transfers
 * Format follows the European Payments Council standard
 */
function generateEpcQrString(session: PaymentSessionDetails): string {
  if (
    !session.bankAccount.iban ||
    typeof session.bankAccount.iban !== "string"
  ) {
    throw new Error("IBAN required for QR code generation");
  }

  const amount = (session.amountCents / 100).toFixed(2);
  const iban = session.bankAccount.iban.replace(/\s/g, "");

  // EPC QR code format (version 002)
  const lines = [
    "BCD", // Service Tag
    "002", // Version
    "1", // Character set (UTF-8)
    "SCT", // Identification (SEPA Credit Transfer)
    "", // BIC (optional for SEPA)
    session.organization.name.slice(0, 70), // Beneficiary name (max 70 chars)
    iban, // Beneficiary IBAN
    `EUR${amount}`, // Amount
    "", // Purpose code (optional)
    session.referenceId, // Remittance reference
    "", // Remittance text (optional, using reference instead)
    "", // Beneficiary to originator information (optional)
  ];

  return lines.join("\n");
}

/**
 * Renders an EPC QR code into the specified container
 */
export async function renderQrCode(
  container: HTMLElement,
  session: PaymentSessionDetails,
): Promise<void> {
  if (!session.bankAccount.iban) {
    container.innerHTML = `<p class="getblitz-error">No bank account configured for this merchant</p>`;
    return;
  }

  try {
    const qrData = generateEpcQrString(session);
    const canvas = document.createElement("canvas");

    await QRCode.toCanvas(canvas, qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    canvas.className = "getblitz-qr-canvas";
    container.appendChild(canvas);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "QR generation failed";
    container.innerHTML = `<p class="getblitz-error">${message}</p>`;
  }
}
