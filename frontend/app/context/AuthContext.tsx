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
  role: "OWNER" | "EMPLOYEE";
  businessId?: string | null;
  active: boolean;
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  isOwner: () => boolean;
  isEmployee: () => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // AQUÍ ES DONDE REEMPLAZAS TODO EL LOADUSER
  const loadUser = useCallback(async () => {
    const token = Cookies.get("token");
    console.log("DEBUG: Token detectado en cookies:", token);

    if (!token) {
      setLoading(false);
      console.log("DEBUG: No hay token, cargando como invitado.");
      return;
    }

    try {
      const data = await me();
      console.log("🔥 DEBUG CRÍTICO - DATOS RECIBIDOS:", data);
      setUser(data);
    } catch (err) {
      console.error("DEBUG: Error en API:", err);
      Cookies.remove("token");
      setUser(null);
    } finally {
      setLoading(false);
      console.log("DEBUG: Proceso de carga finalizado.");
    }
  }, []);

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

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, loadUser, isOwner, isEmployee }}
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
