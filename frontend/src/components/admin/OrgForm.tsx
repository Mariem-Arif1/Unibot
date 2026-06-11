"use client";

import { useState } from "react";
import type { OrgAdmin, OrgCreatePayload } from "@/types/organization";

interface OrgFormProps {
  initialValues?: OrgAdmin;
  onSubmit: (data: OrgCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

export default function OrgForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Create Organization",
}: OrgFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [bcCompanyName, setBcCompanyName] = useState(initialValues?.bc_company_name ?? "");
  const [bcDatabaseUrl, setBcDatabaseUrl] = useState(initialValues?.bc_database_url ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Organization name is required."); return; }
    if (!bcCompanyName.trim()) { setError("BC Company name is required."); return; }
    try {
      await onSubmit({
        name: name.trim(),
        bc_company_name: bcCompanyName.trim(),
        bc_database_url: bcDatabaseUrl.trim() || null,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const inputClass =
    "w-full bg-[#111113] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4a4a4f] focus:outline-none focus:border-[#1488fc]/50 focus:ring-1 focus:ring-[#1488fc]/20 transition-all";
  const labelClass = "block text-xs font-medium text-[#8a8a8f] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Name */}
      <div>
        <label className={labelClass}>Organization Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Corp"
          className={inputClass}
          required
        />
      </div>

      {/* BC Company Name */}
      <div>
        <label className={labelClass}>Business Central Company Name *</label>
        <input
          type="text"
          value={bcCompanyName}
          onChange={(e) => setBcCompanyName(e.target.value)}
          placeholder="e.g. BYS or CRONUS"
          className={`${inputClass} font-mono`}
          required
        />
        <p className="mt-1 text-xs text-[#4a4a4f]">
          The table prefix used in BC SQL Server tables, e.g.{" "}
          <span className="font-mono text-[#6a6a6f]">BYS$Item</span> →{" "}
          <span className="font-mono text-[#6a6a6f]">BYS</span>.
        </p>
      </div>

      {/* BC Database URL */}
      <div>
        <label className={labelClass}>BC Database Connection String</label>
        <textarea
          value={bcDatabaseUrl}
          onChange={(e) => setBcDatabaseUrl(e.target.value)}
          rows={4}
          placeholder={`DRIVER={ODBC Driver 17 for SQL Server};SERVER=myserver;DATABASE=BC_Prod;Trusted_Connection=yes`}
          className={`${inputClass} font-mono text-xs leading-relaxed resize-y`}
        />
        <p className="mt-1 text-xs text-[#4a4a4f]">
          Leave blank to use the global <span className="font-mono text-[#6a6a6f]">BC_DATABASE_URL</span> environment variable.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl bg-[#1488fc] text-white text-sm font-medium hover:bg-[#1488fc]/90 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {isSubmitting && (
            <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
