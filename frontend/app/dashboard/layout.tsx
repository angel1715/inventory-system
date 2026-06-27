"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import SubscriptionGuard from "@/components/SubscriptionGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <SubscriptionGuard>
        <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="flex-1 overflow-auto p-6 lg:p-8 bg-zinc-50">
              {children}
            </main>
          </div>
        </div>
      </SubscriptionGuard>
    </ProtectedRoute>
  );
}
