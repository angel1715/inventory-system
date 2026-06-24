"use client";

import { useEffect, useRef } from "react";

type ScannerOptions = {
    minLength?: number;
    scanTimeout?: number;
    avgCharThreshold?: number;
    duplicateDelay?: number;
};

export function useBarcodeScanner(
    onScan: (code: string) => void,
    options?: ScannerOptions,
) {
    const {
        minLength = 4,
        scanTimeout = 80,
        avgCharThreshold = 45,
        duplicateDelay = 1000,
    } = options || {};

    const buffer = useRef("");
    const scanStart = useRef(0);
    const lastKeyTime = useRef(0);

    const lastScan = useRef("");
    const lastScanTime = useRef(0);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            // Ignore modifiers
            if (
                e.ctrlKey ||
                e.altKey ||
                e.metaKey ||
                e.key === "Shift"
            ) {
                return;
            }

            const now = Date.now();

            // Start new scan
            if (!buffer.current) {
                scanStart.current = now;
            }

            // Reset if timeout exceeded
            if (now - lastKeyTime.current > scanTimeout) {
                buffer.current = "";
                scanStart.current = now;
            }

            lastKeyTime.current = now;

            // ENTER = finalize scan
            if (e.key === "Enter") {
                const code = buffer.current.trim();

                const duration = now - scanStart.current;

                const avgTime =
                    code.length > 0
                        ? duration / code.length
                        : 999;

                // Detect real scanner
                const isScannerLike =
                    avgTime < avgCharThreshold;

                // Anti duplicate
                const isDuplicate =
                    code === lastScan.current &&
                    now - lastScanTime.current <
                    duplicateDelay;

                if (
                    code.length >= minLength &&
                    isScannerLike &&
                    !isDuplicate
                ) {
                    lastScan.current = code;
                    lastScanTime.current = now;

                    onScan(code);
                }

                buffer.current = "";
                return;
            }

            // Ignore non printable keys
            if (e.key.length !== 1) return;

            buffer.current += e.key;
        }

        window.addEventListener("keydown", handleKey);

        return () => {
            window.removeEventListener(
                "keydown",
                handleKey,
            );
        };
    }, [
        onScan,
        minLength,
        scanTimeout,
        avgCharThreshold,
        duplicateDelay,
    ]);
}

