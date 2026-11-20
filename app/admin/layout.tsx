import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-24">
        <h1 className="text-2xl font-semibold text-neutral-900">403 — Forbidden</h1>
        <p className="text-neutral-600">You don&apos;t have access to this area.</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <p className="text-sm font-medium text-neutral-500">Admin</p>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
