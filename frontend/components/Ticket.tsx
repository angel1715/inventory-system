"use client";

type Props = {
  data: any;
};

export default function Ticket({ data }: Props) {
  const subtotal = Number(data.subtotal || 0);
  const tax = Number(data.tax || 0);
  const total = Number(data.total || 0);

  function formatPayment(method: string) {
    switch (method) {
      case "CASH":
        return "Efectivo";
      case "CARD":
        return "Tarjeta";
      case "TRANSFER":
        return "Transferencia";
      default:
        return method;
    }
  }

  return (
    <div
      id="ticket"
      className="bg-white text-black p-4 text-sm font-mono w-[200px]"
    >
      {/* LOGO */}
      <div className="flex justify-center mb-2">
        <img
  src="/logochala.png"
  alt="logo"
  className="w-[70px] h-[70px] object-contain mx-auto"
  style={{
    maxWidth: "70px",
    maxHeight: "70px",
    width: "70px",
    height: "70px",
  }}
  onError={(e) => {
    e.currentTarget.style.display = "none";
  }}
/>
      </div>

      {/* STORE INFO */}
      <div className="text-center">
        <p>Republica Dominicana</p>
        <p>809-917-0343</p>
      </div>

      <div className="border-t border-gray-300 my-3" />

      {/* INVOICE */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Invoice:</span>
          <span>{data.invoiceNumber}</span>
        </div>

        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{new Date(data.createdAt).toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span>Metodo:</span>
          <span>{formatPayment(data.paymentMethod)}</span>
        </div>
      </div>

      <div className="border-t border-gray-300 my-3" />

      {/* ITEMS */}
      <div className="space-y-2">
        {data.items.map((item: any) => (
          <div key={item.id}>
            <div className="flex justify-between">
              <span className="font-semibold">{item.product.name}</span>
              <span>RD${Number(item.lineTotal).toFixed(2)}</span>
            </div>

            <div className="text-xs text-gray-700">
              {item.quantity} x RD${Number(item.salePrice).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-300 my-3" />

      {/* TOTALS */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>RD${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>ITBIS</span>
          <span>RD${tax.toFixed(2)}</span>
        </div>

        <div className="flex justify-between font-bold text-lg">
          <span>TOTAL</span>
          <span>RD${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-between mt-2">
        <span>Items</span>
        <span>{data.items.length}</span>
      </div>

      <div className="border-t border-gray-300 my-3" />

      {/* FOOTER */}
      <div className="text-center text-xs">
        <p>Gracias por su compra!</p>
        <p className="mt-1">Sistema CHALTECH</p>
      </div>
    </div>
  );
}
