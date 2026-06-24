"use client";

import Link from "next/link";

export default function LowStockCard({
  products,
}: {
  products: any[];
}) {
  return (
    <div className="bg-white rounded-3xl border p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">
          ⚠ Low Stock
        </h3>

        <Link
          href="/products"
          className="text-sm text-blue-600"
        >
          View All
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-green-600">
          All products are well stocked
        </p>
      ) : (
        <div className="space-y-3">
          {products.slice(0, 5).map((product) => (
            <div
              key={product.id}
              className="border rounded-xl p-3"
            >
              <p className="font-medium">
                {product.name}
              </p>

              <p className="text-sm text-red-500">
                Stock {product.stock} / Min {product.minStock}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}