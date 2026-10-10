"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, X, Phone, MapPin, ShieldCheck, CalendarClock } from "lucide-react";
import { getPublicTracking } from "@/lib/api";

const MAIN_STEPS = [
  "RECEIVED",
  "DIAGNOSING",
  "REPAIRED",
  "READY_FOR_PICKUP",
  "DELIVERED",
];

const STEP_INFO: Record<string, { title: string; description: string }> = {
  RECEIVED: {
    title: "Equipo recibido",
    description: "Registramos tu equipo en el taller.",
  },
  DIAGNOSING: {
    title: "En diagnóstico",
    description: "Nuestro técnico está revisando tu equipo.",
  },
  REPAIRED: {
    title: "Reparado",
    description: "La reparación fue completada.",
  },
  READY_FOR_PICKUP: {
    title: "Listo para retirar",
    description: "Tu equipo está listo. ¡Ya puedes pasar a buscarlo!",
  },
  DELIVERED: {
    title: "Entregado",
    description: "El equipo fue entregado.",
  },
  CANCELLED: {
    title: "Orden cancelada",
    description:
      "Esta orden fue cancelada. Comunícate con el taller si tienes dudas.",
  },
  NOT_REPAIRABLE: {
    title: "Sin reparación posible",
    description:
      "El técnico determinó que el equipo no se puede reparar. Comunícate con el taller para conocer tus opciones.",
  },
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santo_Domingo",
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Santo_Domingo",
  });

export default function TrackingPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"NOT_FOUND" | "FAILED" | null>(null);

  useEffect(() => {
    if (!token) return;

    getPublicTracking(token)
      .then(setData)
      .catch((err) =>
        setError(err?.message === "NOT_FOUND" ? "NOT_FOUND" : "FAILED"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Consultando el estado de tu reparación...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-10 max-w-md text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">
            {error === "NOT_FOUND"
              ? "Enlace no válido"
              : "No pudimos cargar el estado"}
          </h1>
          <p className="text-zinc-500">
            {error === "NOT_FOUND"
              ? "Este enlace no existe o ya no está disponible. Comunícate con el taller para que te envíen uno nuevo."
              : "Ocurrió un problema al consultar tu reparación. Intenta de nuevo en unos minutos."}
          </p>
        </div>
      </div>
    );
  }

  // Primera vez que se registró cada estado
  const reachedAt = new Map<string, string>();
  for (const entry of data.timeline ?? []) {
    if (!reachedAt.has(entry.status)) reachedAt.set(entry.status, entry.at);
  }

  const isTerminalFailure =
    data.status === "CANCELLED" || data.status === "NOT_REPAIRABLE";

  const steps: string[] = isTerminalFailure
    ? [...MAIN_STEPS.filter((s) => reachedAt.has(s)), data.status]
    : MAIN_STEPS;

  const currentIndex = steps.indexOf(data.status);
  const currentInfo = STEP_INFO[data.status] ?? {
    title: data.status,
    description: "",
  };
  const isFinished = data.status === "DELIVERED" || isTerminalFailure;
  const warrantyExpired =
    !!data.warrantyUntil && new Date(data.warrantyUntil) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-slate-100 pb-12">
      <div className="max-w-xl mx-auto px-4 pt-8 space-y-6">
        {/* Encabezado del negocio */}
        <div className="flex items-center gap-4">
          {data.business?.logoUrl && (
            <img
              src={data.business.logoUrl}
              alt={data.business.name}
              className="w-14 h-14 rounded-2xl object-contain bg-white border border-zinc-100"
            />
          )}
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider">
              Seguimiento de reparación
            </p>
            <h1 className="text-xl font-bold text-zinc-900">
              {data.business?.name}
            </h1>
          </div>
        </div>

        {/* Estado actual */}
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
          <div
            className={`p-8 text-white ${
              isTerminalFailure
                ? "bg-gradient-to-r from-red-500 to-rose-600"
                : data.status === "READY_FOR_PICKUP"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600"
                  : "bg-gradient-to-r from-blue-600 to-violet-600"
            }`}
          >
            {data.customerFirstName && (
              <p className="text-white/80 text-sm mb-1">
                Hola, {data.customerFirstName}
              </p>
            )}
            <h2 className="text-3xl font-bold">{currentInfo.title}</h2>
            <p className="text-white/90 mt-2">{currentInfo.description}</p>
          </div>

          <div className="grid grid-cols-2 divide-x border-t border-zinc-100">
            <div className="p-5">
              <p className="text-xs text-zinc-500">Equipo</p>
              <p className="font-semibold text-zinc-900 mt-1">
                {data.deviceBrand} {data.deviceModel}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs text-zinc-500">Orden</p>
              <p className="font-semibold text-zinc-900 mt-1">
                #{data.ticketNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Entrega estimada */}
        {data.estimatedDelivery && !isFinished && (
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex items-center gap-4">
            <CalendarClock className="text-blue-600 shrink-0" size={28} />
            <div>
              <p className="text-sm text-zinc-500">Entrega estimada</p>
              <p className="font-semibold text-zinc-900">
                {formatDate(data.estimatedDelivery)}
              </p>
            </div>
          </div>
        )}

        {/* Línea de tiempo */}
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-8">
          <h3 className="font-semibold text-lg text-zinc-900 mb-6">
            Progreso de tu reparación
          </h3>

          <ol>
            {steps.map((step, i) => {
              const isCurrent = i === currentIndex;
              const isFailure = isCurrent && isTerminalFailure;
              const isDone =
                i < currentIndex || (isCurrent && data.status === "DELIVERED");
              const info = STEP_INFO[step];
              const at = reachedAt.get(step);

              const circleClass = isFailure
                ? "bg-red-500"
                : isDone
                  ? "bg-green-600"
                  : isCurrent
                    ? "bg-blue-600 ring-4 ring-blue-100"
                    : "bg-zinc-200";

              return (
                <li key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${circleClass}`}
                    >
                      {isFailure ? (
                        <X size={18} className="text-white" />
                      ) : isDone ? (
                        <Check size={18} className="text-white" />
                      ) : isCurrent ? (
                        <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                      ) : null}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-[32px] ${
                          isDone ? "bg-green-600" : "bg-zinc-200"
                        }`}
                      />
                    )}
                  </div>

                  <div className="pb-8">
                    <p
                      className={`font-semibold ${
                        isCurrent || isDone ? "text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      {info?.title ?? step}
                    </p>
                    {(isCurrent || isDone) && info && (
                      <p className="text-sm text-zinc-500 mt-0.5">
                        {info.description}
                      </p>
                    )}
                    {at && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatDateTime(at)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Garantía */}
        {(data.warrantyDays ?? 0) > 0 && (
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex items-center gap-4">
            <ShieldCheck
              className={`shrink-0 ${warrantyExpired ? "text-red-500" : "text-green-600"}`}
              size={28}
            />
            <div>
              <p className="text-sm text-zinc-500">Garantía de la reparación</p>
              <p className="font-semibold text-zinc-900">
                {data.warrantyUntil
                  ? `${warrantyExpired ? "Venció el" : "Vigente hasta el"} ${formatDate(data.warrantyUntil)}`
                  : `${data.warrantyDays} días a partir de la entrega`}
              </p>
            </div>
          </div>
        )}

        {/* Contacto */}
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 space-y-3">
          <p className="font-semibold text-zinc-900">¿Tienes preguntas?</p>
          {data.business?.phone && (
            <a
              href={`tel:${data.business.phone}`}
              className="flex items-center gap-3 text-blue-600 font-medium"
            >
              <Phone size={18} />
              {data.business.phone}
            </a>
          )}
          {data.business?.address && (
            <p className="flex items-start gap-3 text-zinc-600">
              <MapPin size={18} className="shrink-0 mt-0.5" />
              {data.business.address}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400">
          Este enlace es personal. Guárdalo para consultar el estado de tu
          reparación cuando quieras.
        </p>
      </div>
    </div>
  );
}