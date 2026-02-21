"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Goal {
  id: string
  amount: number
  periodStart: string
  periodEnd: string
  createdAt: string
}

interface Commission {
  id: string
  amount: number
  notes: string | null
  loggedDate: string
  loggedBy: { firstName: string; lastName: string }
}

interface Stats {
  goalAmount: number
  totalEarned: number
  remaining: number
  progressPct: number
  daysLeft: number
}

interface DashboardData {
  hasGoal: boolean
  goals: Goal[]
  activeGoal: Goal | null
  stats: Stats | null
  commissions: Commission[]
  commissionRate: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const shortDate = (s: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(s))

const shortDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })

function groupByMonth(commissions: Commission[]) {
  const map: Record<string, number> = {}
  for (const c of commissions) {
    const key = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(c.loggedDate))
    map[key] = (map[key] ?? 0) + Number(c.amount)
  }
  return Object.entries(map)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => {
      const pa = new Date(a.month)
      const pb = new Date(b.month)
      return pa.getTime() - pb.getTime()
    })
}

// ─── Goal Form ────────────────────────────────────────────────────────────────

const goalSchema = z.object({
  amount: z.number().positive("Must be positive"),
  periodStart: z.string().min(1, "Required"),
  periodEnd: z.string().min(1, "Required"),
})
type GoalForm = z.infer<typeof goalSchema>

function SetGoalForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalForm>({ resolver: zodResolver(goalSchema) })
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (data: GoalForm) => {
    setLoading(true)
    setServerError(null)
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json()
      setServerError(json.error ?? "Failed to set goal")
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal Amount ($)</label>
        <input
          {...register("amount", { valueAsNumber: true })}
          type="number"
          min="1"
          step="0.01"
          placeholder="50000"
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
          <input
            {...register("periodStart")}
            type="date"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {errors.periodStart && <p className="text-red-500 text-xs mt-1">{errors.periodStart.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
          <input
            {...register("periodEnd")}
            type="date"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          {errors.periodEnd && <p className="text-red-500 text-xs mt-1">{errors.periodEnd.message}</p>}
        </div>
      </div>
      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-red-600 text-sm">{serverError}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
      >
        {loading ? "Setting goal..." : "Set Goal"}
      </button>
    </form>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecruiterDashboard() {
  const qc = useQueryClient()
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined)
  const [showGoalForm, setShowGoalForm] = useState(false)

  const url = selectedGoalId
    ? `/api/dashboard/recruiter?goalId=${selectedGoalId}`
    : "/api/dashboard/recruiter"

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["recruiter-dashboard", selectedGoalId],
    queryFn: () => fetch(url).then((r) => r.json()),
  })

  const handleGoalSuccess = () => {
    qc.invalidateQueries({ queryKey: ["recruiter-dashboard"] })
    setShowGoalForm(false)
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          Failed to load dashboard. Please refresh.
        </div>
      </div>
    )
  }

  const { hasGoal, goals, activeGoal, stats, commissions, commissionRate } = data!
  const chartData = commissions ? groupByMonth(commissions) : []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
          {activeGoal && (
            <p className="text-sm text-gray-500 mt-0.5">
              Period: {shortDate(activeGoal.periodStart)} — {shortDate(activeGoal.periodEnd)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {goals && goals.length > 1 && (
            <select
              value={selectedGoalId ?? goals[0]?.id}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {shortDate(g.periodStart)} – {shortDate(g.periodEnd)} ({usd(g.amount)})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowGoalForm(!showGoalForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {hasGoal ? "+ New Goal" : "Set Goal"}
          </button>
        </div>
      </div>

      {/* Goal form */}
      {showGoalForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Set New Goal</h2>
          <SetGoalForm onSuccess={handleGoalSuccess} />
        </div>
      )}

      {/* No goal state */}
      {!hasGoal && !showGoalForm && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-500 text-sm mb-3">You haven&apos;t set a goal yet.</p>
          <button
            onClick={() => setShowGoalForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Set Your Goal
          </button>
        </div>
      )}

      {/* Stats */}
      {hasGoal && stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Goal" value={usd(stats.goalAmount)} />
            <StatCard
              label="Earned"
              value={usd(stats.totalEarned)}
              sub={`at ${commissionRate}% commission`}
              accent="text-green-600"
            />
            <StatCard
              label="Remaining"
              value={usd(stats.remaining)}
              accent={stats.remaining === 0 ? "text-green-600" : "text-orange-500"}
            />
            <StatCard
              label="Progress"
              value={`${stats.progressPct}%`}
              accent={stats.progressPct >= 100 ? "text-green-600" : "text-blue-600"}
            />
            <StatCard
              label="Days Left"
              value={stats.daysLeft.toString()}
              sub={stats.daysLeft === 0 ? "Period ended" : "days remaining"}
              accent={stats.daysLeft === 0 ? "text-gray-400" : stats.daysLeft <= 7 ? "text-red-500" : "text-gray-900"}
            />
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Goal Progress</span>
              <span className="text-sm font-semibold text-gray-900">{stats.progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  stats.progressPct >= 100 ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(100, stats.progressPct)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">{usd(0)}</span>
              <span className="text-xs text-gray-400">{usd(stats.goalAmount)}</span>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Commissions by Month</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) => [usd(v ?? 0), "Earned"]}
                    contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Commission History */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Commission History</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {commissions?.length ?? 0} commission{commissions?.length !== 1 ? "s" : ""} in this period
              </p>
            </div>
            {!commissions || commissions.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                No commissions logged in this period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Logged by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{shortDate(c.loggedDate)}</td>
                        <td className="px-5 py-3 text-right font-medium text-green-600">{usd(Number(c.amount))}</td>
                        <td className="px-5 py-3 text-gray-500">{c.notes ?? "—"}</td>
                        <td className="px-5 py-3 text-gray-500">
                          {c.loggedBy.firstName} {c.loggedBy.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">{usd(stats.totalEarned)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
