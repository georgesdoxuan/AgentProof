"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// The PDF report is the browser's own "Save as PDF": print styles in globals.css drop the navigation and buttons.
export function PrintButton({ label = "Télécharger en PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="no-print ml-auto text-link hover:underline">
      {label}
    </button>
  );
}

// Refreshes the server-rendered report while the audit runs.
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

// The report streams in after its loading skeleton, so a link to #blocage-… or #mission-… arrives before its target exists:
// the browser neither scrolls nor matches :target. Once the report is on screen, go to the hash again (no reload).
export function HashLanding() {
  useEffect(() => {
    if (location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)))) location.replace(location.href);
  }, []);
  return null;
}
