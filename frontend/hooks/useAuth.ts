"use client";

import { useEffect, useState } from "react";
import { me } from "@/lib/api";
import { useRouter } from "next/navigation";


export function useAuth() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);

    useEffect(() => {
        async function verify() {
            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    router.push("/login");
                    return;
                }

                await me();

                setLoading(false);
            } catch {
                localStorage.removeItem("token");

                router.push("/login");
            }
        }

        verify();
    }, []);

    return { loading };
}