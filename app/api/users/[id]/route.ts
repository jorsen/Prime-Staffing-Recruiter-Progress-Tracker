import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["RECRUITER", "ADMIN"]).optional(),
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN" && id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      commissionRate: true,
      status: true,
      createdAt: true,
    },
  })

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ...user, commissionRate: user.commissionRate ? Number(user.commissionRate) : null })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Check for duplicate email if email is being changed
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } })
      if (emailTaken) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const statusChanged = parsed.data.status && parsed.data.status !== existing.status

    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        commissionRate: true,
        status: true,
      },
    })

    if (statusChanged) {
      await prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          action: "USER_STATUS_CHANGED",
          entityType: "User",
          entityId: id,
          metadata: { oldStatus: existing.status, newStatus: parsed.data.status },
        },
      })
    }

    return NextResponse.json({ ...user, commissionRate: user.commissionRate ? Number(user.commissionRate) : null })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
