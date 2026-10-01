import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  // Login page bypasses shell
  const h = headers();
  const pathname = h.get("x-pathname") ?? "";

  if (!admin) {
    return <>{children}</>;
  }

  return (
    <AdminShell displayName={admin.displayName} username={admin.username}>
      {children}
    </AdminShell>
  );
}