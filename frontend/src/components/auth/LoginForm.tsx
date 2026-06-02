"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, SendHorizontal } from "lucide-react";
import { login } from "@/services/authService";
import RayBackground from "@/components/layout/RayBackground";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await login(email, password);
      const next = searchParams.get("next") ?? "/bots";
      router.push(next);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden bg-[#0f0f0f] px-4">
      <RayBackground />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-12 rounded-2xl bg-[#1488fc] flex items-center justify-center shadow-[0_0_24px_rgba(20,136,252,0.5)] mb-4">
            <Zap className="size-6 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign in to Unibot
          </h1>
          <p className="text-sm text-[#6a6a6f] mt-1">
            Your AI assistant awaits
          </p>
        </div>

        {/* Card */}
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
          <form
            onSubmit={handleSubmit}
            noValidate
            className="relative rounded-2xl bg-[#1e1e22] ring-1 ring-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_40px_rgba(0,0,0,0.4)] p-6 space-y-4"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#8a8a8f] mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#5a5a5f] focus:outline-none focus:border-[#1488fc]/60 focus:bg-white/[0.06] transition-all"
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#8a8a8f] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#5a5a5f] focus:outline-none focus:border-[#1488fc]/60 focus:bg-white/[0.06] transition-all"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Form error */}
            {errors.form && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <p className="text-red-400 text-sm text-center">
                  {errors.form}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-[0_0_20px_rgba(20,136,252,0.3)] mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <SendHorizontal className="size-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
