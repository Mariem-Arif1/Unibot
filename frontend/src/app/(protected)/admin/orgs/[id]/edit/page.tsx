"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import useSWR from "swr";
import OrgForm from "@/components/admin/OrgForm";
import { getOrg, updateOrg } from "@/services/adminOrgService";
import type { OrgCreatePayload } from "@/types/organization";

export default function EditOrgPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { data: org, isLoading, error } = useSWR(
    id ? `/api/v1/organizations/${id}` : null,
    () => getOrg(id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: OrgCreatePayload) {
    setIsSubmitting(true);
    try {
      await updateOrg(id, data);
      router.push("/admin/orgs");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <button
          onClick={() => router.push("/admin/orgs")}
          className="flex items-center gap-1.5 text-sm text-[#6a6a6f] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="size-4" />
          Back to Organizations
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight">Edit Organization</h1>
        {org && <p className="text-sm text-[#6a6a6f] mt-1">{org.name}</p>}
      </div>

      {isLoading && (
        <div className="space-y-4 max-w-2xl">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">Failed to load organization. Please go back and try again.</p>
      )}

      {org && !isLoading && (
        <OrgForm
          initialValues={org}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
        />
      )}
    </>
  );
}
