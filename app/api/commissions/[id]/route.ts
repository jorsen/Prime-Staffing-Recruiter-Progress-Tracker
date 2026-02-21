import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  try {
    const commission = await prisma.commission.findUnique({
      where: { id, deletedAt: null },
      include: { recruiter: { select: { firstName: true, lastName: true, commissionRate: true } } },
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
        metadata: {
          recruiterName: `${commission.recruiter.firstName} ${commission.recruiter.lastName}`,
          amount: Number(commission.amount),
          commissionRate: commission.recruiter.commissionRate != null ? Number(commission.recruiter.commissionRate) : null,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
