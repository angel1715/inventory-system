"use client";

export default function FullScreenLoader({
  text = "Cargando...",
}: {
  text?: string;
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-zinc-950/90 via-zinc-900/95 to-black/90 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
      {/* Fondo sutil con efecto de partículas */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] bg-[length:50px_50px] opacity-40" />

      <div className="relative flex flex-col items-center">
        {/* Spinner moderno con gradiente y glow */}
        <div className="relative w-20 h-20">
          {/* Anillo exterior */}
          <div className="absolute inset-0 border-4 border-zinc-700 rounded-full" />

          {/* Spinner con gradiente */}
          <div className="absolute inset-0 border-4 border-transparent border-t-violet-500 border-r-fuchsia-500 border-b-cyan-500 rounded-full animate-spin" />

          {/* Glow interno */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Texto con animación */}
        <div className="mt-8 flex flex-col items-center">
          <p className="text-white/90 text-xl font-semibold tracking-wide">
            {text}
          </p>

          {/* Puntos animados */}
          <div className="flex gap-1 mt-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
