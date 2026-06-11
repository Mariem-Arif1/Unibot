"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Bot, Cpu, Building2 } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/admin/bots", label: "Bots", icon: Bot, description: "Business personas" },
  { href: "/admin/agents", label: "Agents", icon: Cpu, description: "LLM configs" },
  { href: "/admin/orgs", label: "Organizations", icon: Building2, description: "DB connections" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.replace("/bots");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="size-5 rounded-full border-2 border-[#1488fc]/30 border-t-[#1488fc] animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <AppHeader />

      {/* Admin sub-nav */}
      <div className="border-b border-white/[0.06] bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1 py-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-white bg-white/[0.06]"
                      : "text-[#6a6a6f] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
