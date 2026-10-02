import Cookies from "js-cookie";

export function getToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    // Unificado para leer de Cookies (coincide con lib/api.ts)
    return Cookies.get("token") || localStorage.getItem("token") || null;
}

export function logout() {
    // Limpiamos ambos lados por seguridad para evitar estados huérfanos
    Cookies.remove("token");
    Cookies.remove("subStatus");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
}

export function getUser(): any {
    if (typeof window === "undefined") return null;

    // Primero intentamos leer del localStorage si guardaste el objeto usuario ahí,
    // o podemos parsearlo si lo tienes en una cookie.
    const userStr = localStorage.getItem("user");
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
}

export function isOwner(): boolean {
    const user = getUser();
    return user?.role === "OWNER";
}

export function isEmployee(): boolean {
    const user = getUser();
    return user?.role === "EMPLOYEE";
}