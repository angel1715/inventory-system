"use client";

import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function SalesChart({ data }: any) {
  return (
    <div
      className="
     bg-white
     rounded-3xl
     border
     p-6
   "
    >
      {" "}
      <h2 className="text-2xl font-bold mb-6">Sales Trend </h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="total"
              stroke="#000"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
