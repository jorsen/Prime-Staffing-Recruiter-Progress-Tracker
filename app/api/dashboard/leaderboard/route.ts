import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") ?? "all"
  const periodStart = searchParams.get("periodStart")
  const periodEnd = searchParams.get("periodEnd")
  const sortBy = searchParams.get("sortBy") ?? "earned"

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: "RECRUITER",
      ...(filter === "active" ? { status: "ACTIVE" } : {}),
    },
    include: {
      goals: {
        where: {
          deletedAt: null,
          ...(periodStart && periodEnd
            ? {
                periodStart: { gte: new Date(periodStart) },
                periodEnd: { lte: new Date(periodEnd) },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      commissions: {
        where: {
          deletedAt: null,
          ...(periodStart && periodEnd
            ? {
                loggedDate: {
                  gte: new Date(periodStart),
                  lte: new Date(periodEnd),
                },
              }
            : {}),
        },
      },
    },
  })

  const leaderboard = users.map((user) => {
    const latestGoal = user.goals[0] ?? null
    const rate = user.commissionRate != null ? Number(user.commissionRate) : 0
    const totalEarned = user.commissions.reduce((sum, c) => sum + Number(c.amount) * (rate / 100), 0)
    const goalAmount = latestGoal ? Number(latestGoal.amount) : 0
    const remaining = Math.max(0, goalAmount - totalEarned)
    const progressPct = goalAmount > 0 ? Math.min(100, (totalEarned / goalAmount) * 100) : 0

    return {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      status: user.status,
      commissionRate: user.commissionRate ? Number(user.commissionRate) : null,
      goal: latestGoal
        ? {
            id: latestGoal.id,
            amount: goalAmount,
            periodStart: latestGoal.periodStart,
            periodEnd: latestGoal.periodEnd,
          }
        : null,
      totalEarned,
      remaining,
      progressPct: Math.round(progressPct * 10) / 10,
    }
  })

  leaderboard.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name)
      case "pct":
        return b.progressPct - a.progressPct
      case "remaining":
        return a.remaining - b.remaining
      default:
        return b.totalEarned - a.totalEarned
    }
  })

  return NextResponse.json(leaderboard)
}
