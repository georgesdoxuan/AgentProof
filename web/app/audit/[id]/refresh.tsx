"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// The PDF report is the browser's own "Save as PDF": print styles in globals.css drop the navigation and buttons.
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print ml-auto text-link hover:underline">
      Télécharger en PDF
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
