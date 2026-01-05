"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export interface EpcQrData {
  beneficiaryName: string;
  iban: string;
  amount: number;
  reference: string;
}

interface QrScannerProps {
  onScan: (data: EpcQrData) => void;
  onClose: () => void;
}

/**
 * Parse EPC QR code format (European Payments Council standard)
 * Format:
 * Line 1: BCD (Service Tag)
 * Line 2: 002 (Version)
 * Line 3: 1 (Character Set)
 * Line 4: SCT (SEPA Credit Transfer)
 * Line 5: BIC (optional)
 * Line 6: Beneficiary Name
 * Line 7: IBAN
 * Line 8: Amount (EUR99.99)
 * Line 9: Purpose (optional)
 * Line 10: Reference
 */
function parseEpcQrCode(data: string): EpcQrData | null {
  const lines = data.split("\n");

  // Validate EPC format
  if (lines.length < 10 || lines[0] !== "BCD" || lines[3] !== "SCT") {
    return null;
  }

  const beneficiaryName = lines[5] ?? "";
  const iban = lines[6] ?? "";
  const amountStr = lines[7] ?? "";
  const reference = lines[9] ?? "";

  // Parse amount (format: EUR99.99)
  const amountMatch = /^EUR(\d+(?:\.\d{2})?)$/.exec(amountStr);
  if (!amountMatch?.[1]) {
    return null;
  }

  const amount = parseFloat(amountMatch[1]);

  return {
    beneficiaryName,
    iban,
    amount,
    reference,
  };
}

// Extend Window interface for BarcodeDetector
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (image: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleScanResult = useCallback(
    (data: string) => {
      const parsed = parseEpcQrCode(data);
      if (parsed) {
        stopCamera();
        onScan(parsed);
      }
    },
    [onScan, stopCamera],
  );

  const startCamera = useCallback(async () => {
    setError(null);
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setIsScanning(false);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError(
            "Camera access denied. Please allow camera access to scan QR codes.",
          );
        } else if (err.name === "NotFoundError") {
          setError(
            "No camera found. Please connect a camera or use manual entry.",
          );
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError("Unknown camera error occurred.");
      }
    }
  }, []);

  // Scanning effect - runs after camera is started
  useEffect(() => {
    if (!isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let mounted = true;

    const scanWithJsQR = () => {
      if (!mounted || video.readyState !== video.HAVE_ENOUGH_DATA) {
        if (mounted) {
          animationRef.current = requestAnimationFrame(scanWithJsQR);
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code?.data) {
        handleScanResult(code.data);
      } else {
        animationRef.current = requestAnimationFrame(scanWithJsQR);
      }
    };

    const scanWithBarcodeDetector = async () => {
      if (!window.BarcodeDetector) {
        scanWithJsQR();
        return;
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

      const scan = async () => {
        if (!mounted || video.readyState !== video.HAVE_ENOUGH_DATA) {
          if (mounted) {
            animationRef.current = requestAnimationFrame(() => void scan());
          }
          return;
        }

        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && barcodes[0]?.rawValue) {
            handleScanResult(barcodes[0].rawValue);
            return;
          }
        } catch {
          // Ignore detection errors and continue scanning
        }

        animationRef.current = requestAnimationFrame(() => void scan());
      };

      await scan();
    };

    // Use BarcodeDetector if available, otherwise fall back to jsQR
    if (window.BarcodeDetector) {
      void scanWithBarcodeDetector();
    } else {
      scanWithJsQR();
    }

    return () => {
      mounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, handleScanResult]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-[var(--tb-accent)]/30 bg-[var(--tb-bg)]">
          <div className="flex items-center justify-between border-b border-[var(--tb-border)] p-4">
            <div>
              <h3 className="font-semibold text-[var(--tb-text)]">
                Scan Payment QR Code
              </h3>
              <p className="mt-1 text-xs text-[var(--tb-text-muted)]">
                Point your camera at the EPC QR code
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-[var(--tb-text-muted)] transition-colors hover:bg-[var(--tb-bg-secondary)] hover:text-[var(--tb-text)]"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="relative aspect-4/3 bg-black">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 h-12 w-12 text-red-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={() => void startCamera()}
                  className="mt-4 rounded-lg bg-[var(--tb-bg-secondary)] px-4 py-2 text-sm text-[var(--tb-text)] transition-colors hover:bg-[var(--tb-border)]"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-48">
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-amber-400" />

                    {/* Scanning line animation */}
                    {isScanning && (
                      <div className="animate-scan-line absolute inset-x-0 h-0.5 bg-amber-400" />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-[var(--tb-border)] p-4">
            <p className="text-center text-xs text-[var(--tb-text-muted)]/70">
              {isScanning && !error ? "Scanning..." : "Camera initializing..."}
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan-line {
          0%,
          100% {
            top: 0;
          }
          50% {
            top: calc(100% - 2px);
          }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
