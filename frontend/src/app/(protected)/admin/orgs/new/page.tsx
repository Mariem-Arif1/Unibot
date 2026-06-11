"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import OrgForm from "@/components/admin/OrgForm";
import { createOrg } from "@/services/adminOrgService";
import type { OrgCreatePayload } from "@/types/organization";

export default function NewOrgPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: OrgCreatePayload) {
    setIsSubmitting(true);
    try {
      await createOrg(data);
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
        <h1 className="text-2xl font-bold text-white tracking-tight">New Organization</h1>
        <p className="text-sm text-[#6a6a6f] mt-1">
          Configure a Business Central connection for this organization.
        </p>
      </div>
      <OrgForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create Organization"
      />
    </>
  );
}
