"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditAction =
  | "COMMISSION_CREATED"
  | "COMMISSION_DELETED"
  | "GOAL_CREATED"
  | "USER_STATUS_CHANGED"

interface AuditLog {
  id: string
  action: AuditAction
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: { firstName: string; lastName: string; email: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const shortDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

const ACTION_LABELS: Record<AuditAction, string> = {
  COMMISSION_CREATED: "Commission Logged",
  COMMISSION_DELETED: "Commission Deleted",
  GOAL_CREATED: "Goal Created",
  USER_STATUS_CHANGED: "User Status Changed",
}

const ACTION_STYLES: Record<AuditAction, string> = {
  COMMISSION_CREATED: "bg-green-100 text-green-700",
  COMMISSION_DELETED: "bg-red-100 text-red-700",
  GOAL_CREATED: "bg-blue-100 text-blue-700",
  USER_STATUS_CHANGED: "bg-yellow-100 text-yellow-700",
}

function MetadataCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return <span className="text-gray-300">—</span>

  const parts: string[] = []
  if (metadata.amount != null) parts.push(`$${Number(metadata.amount).toLocaleString()}`)
  if (metadata.recruiterId) parts.push(`Recruiter: ${String(metadata.recruiterId).slice(0, 8)}…`)
  if (metadata.status) parts.push(`→ ${String(metadata.status)}`)

  return <span className="text-gray-500 text-xs">{parts.join(" · ") || JSON.stringify(metadata)}</span>
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All actions" },
  { value: "COMMISSION_CREATED", label: "Commission Logged" },
  { value: "COMMISSION_DELETED", label: "Commission Deleted" },
  { value: "GOAL_CREATED", label: "Goal Created" },
  { value: "USER_STATUS_CHANGED", label: "User Status Changed" },
]

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("")

  const params = new URLSearchParams({ limit: "200" })
  if (actionFilter) params.set("action", actionFilter)

  const { data: logs, isLoading, isError } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", actionFilter],
    queryFn: () => fetch(`/api/audit-logs?${params}`).then((r) => r.json()),
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all system actions</p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading audit logs...</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load audit logs.</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Entity</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                      {shortDateTime(log.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900 text-sm">
                        {log.actor.firstName} {log.actor.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{log.actor.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_STYLES[log.action]}`}
                      >
                        {ACTION_LABELS[log.action]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {log.entityType}
                    </td>
                    <td className="px-5 py-3.5">
                      <MetadataCell metadata={log.metadata as Record<string, unknown> | null} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {logs && logs.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{logs.length} entries shown</p>
      )}
    </div>
  )
}
