"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ClubActionsProps {
  clubId: string;
  isMember: boolean;
  isOwner: boolean;
  isPublic: boolean;
}

export function ClubActions({ clubId, isMember, isOwner, isPublic }: ClubActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const join = async () => {
    setLoading(true);
    await fetch(`/api/clubs/${clubId}/members`, { method: "POST" });
    setLoading(false);
    router.refresh();
  };

  const leave = async () => {
    setLoading(true);
    await fetch(`/api/clubs/${clubId}/members`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  };

  if (!isMember && isPublic) {
    return <Button size="sm" loading={loading} onClick={join}>Join club</Button>;
  }

  if (isMember && !isOwner) {
    return (
      <Button size="sm" variant="secondary" loading={loading} onClick={leave}>
        Leave club
      </Button>
    );
  }

  return null;
}
