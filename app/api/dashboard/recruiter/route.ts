import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const recruiterId = session.user.id
  const { searchParams } = new URL(request.url)
  const goalId = searchParams.get("goalId")

  const [goals, recruiter] = await Promise.all([
    prisma.goal.findMany({
      where: { recruiterId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: recruiterId },
      select: { commissionRate: true },
    }),
  ])

  const commissionRate = recruiter?.commissionRate != null ? Number(recruiter.commissionRate) : 0

  if (goals.length === 0) {
    return NextResponse.json({ hasGoal: false, goals: [], activeGoal: null, stats: null, commissions: [], commissionRate })
  }

  const activeGoal = goalId ? (goals.find((g) => g.id === goalId) ?? goals[0]) : goals[0]

  const commissions = await prisma.commission.findMany({
    where: {
      recruiterId,
      deletedAt: null,
      loggedDate: {
        gte: activeGoal.periodStart,
        lte: activeGoal.periodEnd,
      },
    },
    include: {
      loggedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { loggedDate: "desc" },
  })

  const totalEarned = commissions.reduce((sum, c) => sum + Number(c.amount) * (commissionRate / 100), 0)
  const goalAmount = Number(activeGoal.amount)
  const remaining = Math.max(0, goalAmount - totalEarned)
  const progressPct = goalAmount > 0 ? Math.min(100, (totalEarned / goalAmount) * 100) : 0

  const now = new Date()
  const periodEnd = new Date(activeGoal.periodEnd)
  const daysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return NextResponse.json({
    hasGoal: true,
    goals,
    activeGoal,
    stats: {
      goalAmount,
      totalEarned,
      remaining,
      progressPct: Math.round(progressPct * 10) / 10,
      daysLeft,
    },
    commissions,
    commissionRate,
  })
}
