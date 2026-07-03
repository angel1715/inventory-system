"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import Cookies from "js-cookie"; // Asegúrate de tener instalada esta librería
import { me } from "@/lib/api";

export type User = {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  role: "OWNER" | "ADMIN" | "EMPLOYEE";
  businessId?: string | null;
  active: boolean;
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>; // Esta es la que refresca
  refreshUser: () => Promise<void>; // Alias para claridad
  isOwner: () => boolean;
  isEmployee: () => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // AQUÍ ES DONDE REEMPLAZAS TODO EL LOADUSER
  // En AuthProvider, asegúrate de esto:
  const loadUser = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // IMPORTANTE: Asegúrate de que la función 'me()' en lib/api.ts
      // NO tenga caché (a veces los navegadores cachean los GET)
      const data = await me();
      setUser(data);
    } catch (err) {
      Cookies.remove("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []); // Está bien, pero asegúrate de que 'me()' sea confiable.

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (token: string) => {
    Cookies.set("token", token, { expires: 7, path: "/", sameSite: "lax" });

    // LOG DE VERIFICACIÓN INMEDIATA
    const check = Cookies.get("token");
    console.log("DEBUG: ¿Se escribió la cookie correctamente?", check);

    await loadUser();
  };

  const logout = () => {
    Cookies.remove("token");
    setUser(null);
    window.location.replace("/login");
  };

  const isOwner = () => user?.role === "OWNER";
  const isEmployee = () => user?.role === "EMPLOYEE";

  const refreshUser = loadUser;
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        loadUser,
        refreshUser, // Ahora disponible en el hook useAuth
        isOwner,
        isEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
