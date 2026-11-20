import type { Metadata } from "next";
import { unsubscribeFromReminders } from "@/lib/reminders/unsubscribe";
import { ReminderError } from "@/lib/reminders/errors";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; token?: string }>;
}) {
  const { userId, token } = await searchParams;

  let heading = "Unsubscribed";
  let message = "You won't receive any more result reminder emails.";

  if (!userId || !token) {
    heading = "Invalid link";
    message = "This unsubscribe link is missing required information.";
  } else {
    try {
      await unsubscribeFromReminders(userId, token);
    } catch (error) {
      heading = "Invalid link";
      message =
        error instanceof ReminderError
          ? "This unsubscribe link is invalid."
          : "Something went wrong. Please try again.";
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <Card>
        <h1 className="text-xl font-semibold text-neutral-900">{heading}</h1>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
      </Card>
    </main>
  );
}
