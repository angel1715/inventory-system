"use client";

import Link from "next/link";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {title}
        </h1>

        {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
      </div>

      <Link
        href="/dashboard"
        className="
          bg-gray-800
          text-white
          px-5
          py-3
          rounded-2xl
          hover:opacity-90
          transition
          text-center
          w-full
          md:w-auto
        "
      >
        Dashboard
      </Link>
    </div>
  );
}
