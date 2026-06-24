export default function StatCard({ title, value, growth }: any) {
  const positive = growth >= 0;

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm">
      <p className="text-gray-500 text-sm">{title}</p>

      <h2 className="text-3xl font-bold mt-2">{value}</h2>

      {growth !== undefined && (
        <p
          className={`mt-2 text-sm font-semibold ${
            positive ? "text-green-600" : "text-red-500"
          }`}
        >
          {positive ? "+" : ""}
          {growth.toFixed(1)}%
        </p>
      )}
    </div>
  );
}