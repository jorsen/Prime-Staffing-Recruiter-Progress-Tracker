import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcryptjs from "bcryptjs"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const passwordMatch = await bcryptjs.compare(parsed.data.currentPassword, user.passwordHash)
    if (!passwordMatch) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })

    const newHash = await bcryptjs.hash(parsed.data.newPassword, 12)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
