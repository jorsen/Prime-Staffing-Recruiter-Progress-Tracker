import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
import bcryptjs from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcryptjs.hash("Admin@123", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@primestaffing.com" },
    update: {},
    create: {
      email: "admin@primestaffing.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      status: "ACTIVE",
    },
  })

  console.log("Seed complete. Admin user:", admin.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
