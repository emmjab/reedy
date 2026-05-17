"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="text-sm text-gray-500 hover:text-gray-800"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}
