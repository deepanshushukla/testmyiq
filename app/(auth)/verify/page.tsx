import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900">Verify your email</h1>
      <Suspense>
        <VerifyForm />
      </Suspense>
    </main>
  );
}
