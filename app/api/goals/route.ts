import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createGoalSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  periodStart: z.string(),
  periodEnd: z.string(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const recruiterId = searchParams.get("recruiterId") ?? session.user.id

  if (session.user.role !== "ADMIN" && recruiterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const goals = await prisma.goal.findMany({
    where: { recruiterId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(goals)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = createGoalSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { amount, periodStart, periodEnd } = parsed.data

    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 })
    }
    if (end <= start) {
      return NextResponse.json({ error: "Period end must be after period start" }, { status: 400 })
    }

    const goal = await prisma.goal.create({
      data: {
        recruiterId: session.user.id,
        amount,
        periodStart: start,
        periodEnd: end,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "GOAL_CREATED",
        entityType: "Goal",
        entityId: goal.id,
        metadata: { amount, periodStart, periodEnd },
      },
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
