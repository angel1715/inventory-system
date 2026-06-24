"use client";

import { useSettings } from "./useSettings";

export function useCurrency() {
    const { settings } = useSettings();

    const currency =
        settings?.currency || "DOP";

    function format(
        value: number
    ) {
        return `${currency} ${Number(
            value || 0
        ).toFixed(2)}`;
    }

    return {
        currency,
        format,
    };
}