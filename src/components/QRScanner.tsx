import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
        }
      },
      (error) => {
        // quiet error
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.warn("Scanner cleanup failed", error));
      }
    };
  }, [onScan]);

  return (
    <div className="flex flex-col items-center">
      <div id="qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden border border-border shadow-md" />
      <p className="mt-4 text-xs text-muted-foreground animate-pulse">Wait for camera and hold card steady</p>
    </div>
  );
}
