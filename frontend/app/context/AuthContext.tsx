"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import Cookies from "js-cookie";
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
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isOwner: () => boolean;
  isEmployee: () => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      // Intentamos obtener los datos del usuario con el token actual
      const data = await me();
      setUser(data);
    } catch (err) {
      console.error("Error al validar sesión en reload:", err);
      // OJO: Si hay un fallo de red momentáneo al recargar, 
      // no borres la cookie de inmediato para evitar falsos positivos de desconexión.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (token: string) => {
    Cookies.set("token", token, { expires: 7, path: "/", sameSite: "lax" });
    setLoading(true);
    await loadUser();
  };

  const logout = () => {
    Cookies.remove("token");
    Cookies.remove("subStatus");
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
        refreshUser,
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