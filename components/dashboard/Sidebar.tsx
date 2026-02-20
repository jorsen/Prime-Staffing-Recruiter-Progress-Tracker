"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

interface SidebarProps {
  user: { name: string; role: string }
}

const adminNav = [
  { href: "/dashboard/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/settings", label: "Settings" },
]

const recruiterNav = [
  { href: "/dashboard/recruiter", label: "My Dashboard" },
  { href: "/dashboard/settings", label: "Settings" },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = user.role === "ADMIN"
  const navItems = isAdmin ? adminNav : recruiterNav

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-screen">
      <div className="p-5 border-b border-gray-200">
        <p className="text-xs font-semibold text-blue-600 tracking-widest uppercase mb-1">Prime Staffing</p>
        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
        <span
          className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
            isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          }`}
        >
          {isAdmin ? "Admin" : "Recruiter"}
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
