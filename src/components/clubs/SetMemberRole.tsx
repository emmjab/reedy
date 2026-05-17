"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SetMemberRoleProps {
  clubId: string;
  userId: string;
  role: "MEMBER" | "ADMIN" | "OWNER";
}

export function SetMemberRole({ clubId, userId, role }: SetMemberRoleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setRole = async (newRole: "MEMBER" | "ADMIN") => {
    setLoading(true);
    await fetch(`/api/clubs/${clubId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setLoading(false);
    router.refresh();
  };

  if (role === "ADMIN") {
    return (
      <p className="text-xs text-gray-400">
        Admin ·{" "}
        <button
          onClick={() => setRole("MEMBER")}
          disabled={loading}
          className="text-brand-600 hover:underline disabled:opacity-50"
        >
          Revoke
        </button>
      </p>
    );
  }

  return (
    <button
      onClick={() => setRole("ADMIN")}
      disabled={loading}
      className="text-xs text-brand-600 hover:underline disabled:opacity-50"
    >
      Make admin
    </button>
  );
}
