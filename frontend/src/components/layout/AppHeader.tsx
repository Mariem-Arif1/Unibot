"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Zap } from "lucide-react";
import { logout } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <header className="flex items-center justify-between px-4 h-13 border-b border-white/[0.06] bg-[#0f0f0f] shrink-0 py-2">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1.5 rounded-lg text-[#8a8a8f] hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label="Toggle menu"
          >
            <Menu className="size-4" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-[#1488fc] flex items-center justify-center shadow-[0_0_12px_rgba(20,136,252,0.4)]">
            <Zap className="size-3.5 text-white fill-white" />
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">
            Unibot
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <span className="hidden sm:block text-xs text-[#6a6a6f]">
            {user.display_name}
          </span>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-[#8a8a8f] hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">
            {loggingOut ? "Logging out…" : "Log out"}
          </span>
        </button>
      </div>
    </header>
  );
}
