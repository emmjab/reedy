"use client";

import { useState } from "react";

interface PrivacySettingsProps {
  initial: {
    friendsCanSeeReading: boolean;
    friendsCanSeeRead: boolean;
    friendsCanSeeWantTo: boolean;
    friendsCanSeeClubs: boolean;
  };
}

const SETTINGS = [
  { key: "friendsCanSeeReading", label: "Currently reading" },
  { key: "friendsCanSeeRead",    label: "Recently read & ratings" },
  { key: "friendsCanSeeWantTo",  label: "Want to read list" },
  { key: "friendsCanSeeClubs",   label: "Book clubs" },
] as const;

export function PrivacySettings({ initial }: PrivacySettingsProps) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const toggle = async (key: keyof typeof initial) => {
    const newVal = !values[key];
    setValues((v) => ({ ...v, [key]: newVal }));
    setSaving(key);
    setError(false);
    try {
      const res = await fetch("/api/user/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
      if (!res.ok) {
        setValues((v) => ({ ...v, [key]: !newVal }));
        setError(true);
      }
    } catch {
      setValues((v) => ({ ...v, [key]: !newVal }));
      setError(true);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Choose what friends can see on your profile.</p>
      {SETTINGS.map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="text-sm text-gray-700">{label}</span>
          <button
            role="switch"
            aria-checked={values[key]}
            disabled={saving === key}
            onClick={() => toggle(key)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${
              values[key] ? "bg-brand-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                values[key] ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      ))}
      {error && <p className="text-xs text-red-500">Failed to save — try again</p>}
    </div>
  );
}
