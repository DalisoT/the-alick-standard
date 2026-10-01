import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const [row] = await db
    .select()
    .from(schema.businessSettings)
    .where(eq(schema.businessSettings.id, "singleton"))
    .limit(1);

  const settings = row ?? {
    id: "singleton",
    businessName: "THE ALICK STANDARD",
    tagline: "More Than a Cut. It's the Standard.",
    shopAddress: "",
    shopPhone: "",
    whatsappNumber: "",
    defaultTravelFeeNgwee: 5000,
    slotIntervalMinutes: 30,
    notificationsEnabled: true,
    notifyOnBookingReceived: true,
    notifyOnBookingConfirmed: true,
    notifyOnBookingCancelled: true,
    notifyOnAppointmentReminder: true,
    notifyOnAppointmentCompleted: false,
  };

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-3xl">
      <div className="mb-8">
        <p className="label-eyebrow mb-2">Configuration</p>
        <h1 className="font-display text-4xl">Settings</h1>
        <p className="text-cream/55 mt-1 text-sm">
          Business info, travel fee, and notification preferences.
        </p>
      </div>

      <SettingsForm
        initial={{
          businessName: settings.businessName,
          tagline: settings.tagline,
          shopAddress: settings.shopAddress,
          shopPhone: settings.shopPhone,
          whatsappNumber: settings.whatsappNumber,
          defaultTravelFeeNgwee: settings.defaultTravelFeeNgwee,
          slotIntervalMinutes: settings.slotIntervalMinutes,
          notificationsEnabled: settings.notificationsEnabled,
          notifyOnBookingReceived: settings.notifyOnBookingReceived,
          notifyOnBookingConfirmed: settings.notifyOnBookingConfirmed,
          notifyOnBookingCancelled: settings.notifyOnBookingCancelled,
          notifyOnAppointmentReminder: settings.notifyOnAppointmentReminder,
          notifyOnAppointmentCompleted: settings.notifyOnAppointmentCompleted,
        }}
      />
    </div>
  );
}