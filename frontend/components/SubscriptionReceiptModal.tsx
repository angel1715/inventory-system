"use client";

interface SubscriptionReceiptModalProps {
  url: string;
  onClose: () => void;
}

export function SubscriptionReceiptModal({
  url,
  onClose,
}: SubscriptionReceiptModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full bg-white rounded-2xl p-2 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
        >
          ✕
        </button>
        <img
          src={url}
          alt="Comprobante de Suscripción"
          className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
        />
      </div>
    </div>
  );
}
