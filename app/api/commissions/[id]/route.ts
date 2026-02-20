import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  try {
    const commission = await prisma.commission.findUnique({
      where: { id, deletedAt: null },
    })
    if (!commission) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.commission.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "COMMISSION_DELETED",
        entityType: "Commission",
        entityId: id,
        metadata: { amount: Number(commission.amount), recruiterId: commission.recruiterId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
