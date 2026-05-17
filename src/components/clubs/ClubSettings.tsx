"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClubSettingsProps {
  clubId: string;
  defaultRole: "MEMBER" | "ADMIN" | "OWNER";
}

export function ClubSettings({ clubId, defaultRole: initial }: ClubSettingsProps) {
  const router = useRouter();
  const [defaultRole, setDefaultRole] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = defaultRole === "ADMIN" ? "MEMBER" : "ADMIN";
    setDefaultRole(next);
    setLoading(true);
    await fetch(`/api/clubs/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultRole: next }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Settings</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={defaultRole === "ADMIN"}
            onChange={toggle}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
          />
          <div>
            <p className="text-sm font-medium text-gray-800">New members join as admin</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Admins can set the current book, manage the queue, and remove suggestions.
            </p>
          </div>
        </label>
      </div>
    </section>
  );
}
