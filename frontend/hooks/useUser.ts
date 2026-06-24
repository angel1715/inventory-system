"use client";

import { useEffect, useState } from "react";

// Agregamos subscriptionStatus aquí
type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    subscriptionStatus: string; // <--- Añadido
};

export function useUser() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("user");

            if (!stored) {
                setUser(null);
                return;
            }

            const parsed = JSON.parse(stored);

            setUser(parsed);
        } catch (err) {
            console.error("Invalid user storage");
            setUser(null);
        }
    }, []);

    return user;
}