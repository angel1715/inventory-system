"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Pencil,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import { getUsers, createUser, updateUser, toggleUser } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
};

type FormDataType = {
  name: string;
  email: string;
  password: string;
  role: string;
};

const initialForm: FormDataType = {
  name: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
};

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormDataType>(initialForm);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleOpenCreate() {
    setEditingUser(null);
    setForm(initialForm);
    setOpen(true);
  }

  function handleOpenEdit(user: User) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nombre y email son requeridos");
      return;
    }
    if (!editingUser && !form.password.trim()) {
      toast.error("La contraseña es requerida");
      return;
    }

    try {
      setSaving(true);
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: form.name,
          email: form.email,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success("Empleado actualizado exitosamente");
      } else {
        await createUser(form);
        toast.success("Empleado creado exitosamente");
      }
      setOpen(false);
      setForm(initialForm);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar el empleado");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(user: User) {
    try {
      await toggleUser(user.id);
      toast.success(
        user.active ? "Empleado deshabilitado" : "Empleado habilitado",
      );
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.message || "Acción fallida");
    }
  }

  return (
    <ProtectedRoute>
      <RoleGuard roles={["OWNER"]}>
        <div className="min-h-screen bg-gray-50 p-8 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Empleados</h1>
              <p className="text-gray-500 mt-1">
                Administra el personal y sus permisos de acceso.
              </p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 transition px-5 py-3 rounded-2xl font-medium shadow-sm"
              >
                <ArrowLeft size={16} /> Dashboard
              </Link>
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition shadow-md"
              >
                <UserPlus size={18} /> Agregar Empleado
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-16 text-center text-gray-500">
                Cargando listado de empleados...
              </div>
            ) : users.length === 0 ? (
              <div className="p-16 text-center text-gray-500">
                No hay empleados registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/70 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Nombre
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Email
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Rol
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500">
                        Estado
                      </th>
                      <th className="p-4 text-sm font-bold text-gray-500 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 font-bold text-gray-900">
                          {user.name}
                        </td>
                        <td className="p-4 text-gray-600">{user.email}</td>
                        <td className="p-4">
                          <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                          >
                            {user.active ? (
                              <ShieldCheck size={12} />
                            ) : (
                              <ShieldAlert size={12} />
                            )}
                            {user.active ? "ACTIVO" : "INACTIVO"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold transition"
                            >
                              <Pencil size={12} /> Editar
                            </button>
                            <button
                              onClick={() => handleToggle(user)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold text-white transition ${user.active ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}
                            >
                              {user.active ? "Deshabilitar" : "Habilitar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {open && (
            <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto p-6 backdrop-blur-sm">
              <div className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl mt-10 border border-gray-100 animate-in zoom-in-95 duration-150">
                <h2 className="text-gray-600 text-3xl font-bold mb-6">
                  {editingUser ? "Editar Empleado" : "Nuevo Empleado"}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="text-gray-600 w-full border p-4 rounded-2xl mt-1 outline-none focus:ring-2 focus:ring-black"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="text-gray-600 w-full border p-4 rounded-2xl mt-1 outline-none focus:ring-2 focus:ring-black"
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Contraseña{" "}
                      {editingUser && "(dejar en blanco para no cambiar)"}
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="text-gray-600 w-full border p-4 rounded-2xl mt-1 outline-none focus:ring-2 focus:ring-black"
                      placeholder="password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">
                      Rol
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                      className="text-gray-600 w-full border p-4 rounded-2xl mt-1 outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 bg-red-600 p-4 rounded-2xl font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-black text-white p-4 rounded-2xl font-bold"
                  >
                    {saving ? "Guardando..." : "Guardar Empleado"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
}
