import { Suspense } from "react";
import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900">Create your account</h1>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
