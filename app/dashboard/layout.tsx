import { auth } from "@/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/dashboard/DashboardShell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <DashboardShell user={{ name: session.user.name ?? "User", role: session.user.role }}>
      {children}
    </DashboardShell>
  )
}
