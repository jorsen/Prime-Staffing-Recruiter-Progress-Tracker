"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "RECRUITER" | "ADMIN"
  commissionRate: number | null
  status: "ACTIVE" | "INACTIVE"
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const shortDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })

// ─── Create / Edit User Form ──────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().optional(),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  role: z.enum(["RECRUITER", "ADMIN"]),
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
})
type UserForm = z.infer<typeof createUserSchema>

function UserModal({
  editing,
  onClose,
  onSuccess,
}: {
  editing: User | null
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!editing

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: editing
      ? {
          email: editing.email,
          firstName: editing.firstName,
          lastName: editing.lastName,
          role: editing.role,
          commissionRate: editing.commissionRate ?? undefined,
          status: editing.status,
          password: "",
        }
      : { role: "RECRUITER", status: "ACTIVE" },
  })

  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: UserForm) => {
    if (!isEdit && (!data.password || data.password.length < 8)) {
      setServerError("Password must be at least 8 characters")
      return
    }
    setLoading(true)
    setServerError(null)

    const url = isEdit ? `/api/users/${editing!.id}` : "/api/users"
    const method = isEdit ? "PATCH" : "POST"

    const body = isEdit
      ? {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role,
          commissionRate: data.commissionRate ?? null,
          status: data.status,
        }
      : data

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json()
      setServerError(json.error ?? "Failed to save user")
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? `Edit ${editing!.firstName}` : "Add New User"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                {...register("firstName")}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                {...register("lastName")}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...register("email")}
              type="email"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="Min. 8 characters"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                {...register("role")}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="RECRUITER">Recruiter</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
              <input
                {...register("commissionRate", { valueAsNumber: true })}
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g. 15"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                {...register("status")}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-red-600 text-sm">{serverError}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPERADMIN"
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "recruiter" | "admin">("all")

  const { data: users, isLoading, isError } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  })

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ["users"] })
    setEditingUser(null)
    setShowCreate(false)
  }

  const handleToggleStatus = async (user: User) => {
    const next = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    const label = next === "INACTIVE" ? "Deactivate" : "Activate"
    if (!confirm(`${label} ${user.firstName} ${user.lastName}?`)) return
    setTogglingId(user.id)
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    setTogglingId(null)
    qc.invalidateQueries({ queryKey: ["users"] })
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Permanently delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return
    setDeletingId(user.id)
    await fetch(`/api/users/${user.id}`, { method: "DELETE" })
    setDeletingId(null)
    qc.invalidateQueries({ queryKey: ["users"] })
  }

  const filtered = users?.filter((u) => {
    if (filter === "recruiter") return u.role === "RECRUITER"
    if (filter === "admin") return u.role === "ADMIN"
    return true
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          + Add User
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit text-sm bg-white">
        {(["all", "recruiter", "admin"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 font-medium capitalize transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "All" : f === "recruiter" ? "Recruiters" : "Admins"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading users...</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load users.</div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Comm. Rate</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {user.role === "ADMIN" ? "Admin" : "Recruiter"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {user.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-600">
                      {user.commissionRate != null ? `${user.commissionRate}%` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{shortDateTime(user.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={togglingId === user.id}
                          className={`text-xs font-medium disabled:opacity-50 ${
                            user.status === "ACTIVE"
                              ? "text-yellow-600 hover:text-yellow-800"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          {togglingId === user.id ? "..." : user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            {deletingId === user.id ? "..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editingUser) && (
        <UserModal
          editing={editingUser}
          onClose={() => { setEditingUser(null); setShowCreate(false) }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
