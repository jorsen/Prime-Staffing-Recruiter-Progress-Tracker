import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/email"

const schema = z.object({
  email: z.string().email(),
})

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const { email } = parsed.data

    // Always return success to avoid leaking whether an email exists
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    })

    if (user && user.status === "ACTIVE") {
      const token = crypto.randomBytes(32).toString("hex")
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      })

      const resetUrl = `${APP_URL}/reset-password?token=${token}`

      sendPasswordResetEmail({
        to: email,
        firstName: user.firstName,
        resetUrl,
      }).catch((err) => console.error("Reset email failed:", err))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
