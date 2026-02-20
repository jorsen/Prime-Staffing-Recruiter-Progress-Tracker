import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/dashboard/Sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar user={{ name: session.user.name ?? "User", role: session.user.role }} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
