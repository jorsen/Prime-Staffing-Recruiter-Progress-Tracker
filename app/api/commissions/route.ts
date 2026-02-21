import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCommissionSchema = z.object({
  recruiterId: z.string(),
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().optional(),
  loggedDate: z.string(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const recruiterId = searchParams.get("recruiterId") ?? session.user.id
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN"
  if (!isAdmin && recruiterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const commissions = await prisma.commission.findMany({
    where: {
      recruiterId,
      deletedAt: null,
      ...(from || to
        ? {
            loggedDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      loggedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { loggedDate: "desc" },
  })

  return NextResponse.json(commissions)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await request.json()
    const parsed = createCommissionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { recruiterId, amount, notes, loggedDate } = parsed.data

    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterId, deletedAt: null, role: "RECRUITER" },
    })
    if (!recruiter) return NextResponse.json({ error: "Recruiter not found" }, { status: 404 })

    const commission = await prisma.commission.create({
      data: {
        recruiterId,
        amount,
        loggedById: session.user.id,
        notes,
        loggedDate: new Date(loggedDate),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "COMMISSION_CREATED",
        entityType: "Commission",
        entityId: commission.id,
        metadata: { recruiterName: `${recruiter.firstName} ${recruiter.lastName}`, amount, loggedDate, commissionRate: recruiter.commissionRate != null ? Number(recruiter.commissionRate) : null },
      },
    })

    return NextResponse.json(commission, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
