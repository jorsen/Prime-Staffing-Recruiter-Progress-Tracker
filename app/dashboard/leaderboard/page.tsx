"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string
  name: string
  email: string
  status: string
  commissionRate: number | null
  goal: { id: string; amount: number; periodStart: string; periodEnd: string } | null
  totalEarned: number
  remaining: number
  progressPct: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const shortDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

// ─── Commission Form ──────────────────────────────────────────────────────────

const commissionSchema = z.object({
  recruiterId: z.string(),
  amount: z.number().positive("Must be positive"),
  loggedDate: z.string().min(1, "Required"),
  notes: z.string().optional(),
})
type CommissionForm = z.infer<typeof commissionSchema>

function LogCommissionModal({
  recruiter,
  onClose,
  onSuccess,
}: {
  recruiter: LeaderboardEntry
  onClose: () => void
  onSuccess: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommissionForm>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      recruiterId: recruiter.id,
      loggedDate: new Date().toISOString().split("T")[0],
    },
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: CommissionForm) => {
    setLoading(true)
    setServerError(null)
    const res = await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, loggedDate: new Date(data.loggedDate).toISOString() }),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setServerError(json.error ?? "Failed to log commission")
      return
    }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-semibold text-gray-900">Log Commission — {recruiter.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("recruiterId")} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              {...register("amount", { valueAsNumber: true })}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="5000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              {...register("loggedDate")}
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.loggedDate && <p className="text-red-500 text-xs mt-1">{errors.loggedDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              {...register("notes")}
              type="text"
              placeholder="Placement, client name, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
              {loading ? "Logging..." : "Log Commission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Recruiter Detail Modal ───────────────────────────────────────────────────

function RecruiterDetailModal({
  recruiter,
  onClose,
  onLogCommission,
}: {
  recruiter: LeaderboardEntry
  onClose: () => void
  onLogCommission: () => void
}) {
  const { data: commissions, isLoading } = useQuery({
    queryKey: ["commissions", recruiter.id],
    queryFn: () => fetch(`/api/commissions?recruiterId=${recruiter.id}`).then((r) => r.json()),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{recruiter.name}</h2>
            <p className="text-xs text-gray-500">{recruiter.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onLogCommission}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              + Log Commission
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">&times;</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
          {[
            { label: "Goal", value: recruiter.goal ? usd(recruiter.goal.amount) : "No goal" },
            { label: "Earned", value: usd(recruiter.totalEarned) },
            { label: "Progress", value: `${recruiter.progressPct}%` },
          ].map((s) => (
            <div key={s.label} className="p-4 text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${recruiter.progressPct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(100, recruiter.progressPct)}%` }}
            />
          </div>
        </div>

        {/* Commission list */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading...</div>
          ) : !commissions || commissions.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No commissions logged yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c: { id: string; loggedDate: string; amount: number; notes: string | null }) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{shortDate(c.loggedDate)}</td>
                    <td className="px-6 py-3 text-right font-medium text-green-600">{usd(Number(c.amount))}</td>
                    <td className="px-6 py-3 text-gray-500">{c.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortBy = "earned" | "pct" | "remaining" | "name"
type Filter = "all" | "active"

export default function LeaderboardPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>("all")
  const [sortBy, setSortBy] = useState<SortBy>("earned")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [selectedRecruiter, setSelectedRecruiter] = useState<LeaderboardEntry | null>(null)
  const [loggingFor, setLoggingFor] = useState<LeaderboardEntry | null>(null)

  const params = new URLSearchParams({ filter, sortBy })
  if (periodStart) params.set("periodStart", new Date(periodStart).toISOString())
  if (periodEnd) params.set("periodEnd", new Date(periodEnd).toISOString())

  const { data, isLoading, isError } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", filter, sortBy, periodStart, periodEnd],
    queryFn: () => fetch(`/api/dashboard/leaderboard?${params}`).then((r) => r.json()),
  })

  const handleCommissionSuccess = () => {
    qc.invalidateQueries({ queryKey: ["leaderboard"] })
    qc.invalidateQueries({ queryKey: ["commissions"] })
    setLoggingFor(null)
  }

  const progressColor = (pct: number) => {
    if (pct >= 100) return "bg-green-500"
    if (pct >= 75) return "bg-blue-500"
    if (pct >= 50) return "bg-yellow-400"
    return "bg-red-400"
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["all", "active"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 font-medium transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "All" : "Active only"}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="earned">Sort: Highest Earned</option>
          <option value="pct">Sort: % Complete</option>
          <option value="remaining">Sort: Closest to Goal</option>
          <option value="name">Sort: Name</option>
        </select>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Period:</span>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span>—</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(periodStart || periodEnd) && (
            <button
              onClick={() => { setPeriodStart(""); setPeriodEnd("") }}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading leaderboard...</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-red-500">Failed to load leaderboard.</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No recruiters found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Goal</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Earned</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Remaining</th>
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[140px]">Progress</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedRecruiter(entry)}
                  >
                    <td className="px-5 py-3.5 text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{entry.name}</p>
                      <p className="text-xs text-gray-400">{entry.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-600">
                      {entry.goal ? usd(entry.goal.amount) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-green-600">
                      {usd(entry.totalEarned)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-600">
                      {entry.goal ? usd(entry.remaining) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${progressColor(entry.progressPct)}`}
                            style={{ width: `${Math.min(100, entry.progressPct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-9 text-right">
                          {entry.progressPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          entry.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {entry.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setLoggingFor(entry)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                      >
                        + Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedRecruiter && !loggingFor && (
        <RecruiterDetailModal
          recruiter={selectedRecruiter}
          onClose={() => setSelectedRecruiter(null)}
          onLogCommission={() => {
            setLoggingFor(selectedRecruiter)
            setSelectedRecruiter(null)
          }}
        />
      )}
      {loggingFor && (
        <LogCommissionModal
          recruiter={loggingFor}
          onClose={() => setLoggingFor(null)}
          onSuccess={handleCommissionSuccess}
        />
      )}
    </div>
  )
}
