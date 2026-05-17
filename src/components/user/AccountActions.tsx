"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AccountActions() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = () => {
    window.location.href = "/api/user/export";
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) { setError("Failed — try again"); return; }
      router.push("/");
    } catch {
      setError("Failed — try again");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
      <div>
        <h3 className="font-semibold text-gray-800">Export your data</h3>
        <p className="mt-1 text-sm text-gray-500">Download all your books as a spreadsheet (CSV).</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={exportData}>
          Export books
        </Button>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="font-semibold text-red-700">Delete account</h3>
        <p className="mt-1 text-sm text-gray-500">
          Permanently deletes your account and all your data. This cannot be undone.
        </p>
        {!confirming ? (
          <Button size="sm" variant="danger" className="mt-3" onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-gray-700">
              Type <span className="font-mono font-semibold">delete</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-40"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="danger"
                loading={deleting}
                disabled={confirmText !== "delete"}
                onClick={deleteAccount}
              >
                Confirm delete
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setConfirming(false); setConfirmText(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
