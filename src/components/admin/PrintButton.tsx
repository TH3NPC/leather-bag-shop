"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary btn-sm">
      <Printer size={15} /> Print
    </button>
  );
}
