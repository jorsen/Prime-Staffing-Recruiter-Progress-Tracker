/**
 * Dashboard math — progress %, remaining, capped at 100%, sorting.
 */
import { GET as getLeaderboard } from "@/app/api/dashboard/leaderboard/route"

const mockAuth = jest.fn()
jest.mock("@/auth", () => ({ auth: (...args: unknown[]) => mockAuth(...args) }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: jest.fn() },
  },
}))

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", role: "ADMIN", name: "Admin" },
}

function makeUser(id: string, name: string, goalAmount: number, earned: number) {
  return {
    id,
    firstName: name.split(" ")[0],
    lastName: name.split(" ")[1] ?? "X",
    email: `${id}@test.com`,
    status: "ACTIVE",
    commissionRate: null,
    goals: goalAmount > 0
      ? [{ id: `g-${id}`, amount: { toString: () => String(goalAmount) }, periodStart: new Date(), periodEnd: new Date() }]
      : [],
    commissions: earned > 0 ? [{ amount: { valueOf: () => earned } }] : [],
  }
}

describe("Leaderboard math", () => {
  const { prisma } = require("@/lib/prisma")

  beforeEach(() => {
    mockAuth.mockResolvedValue(adminSession)
  })

  it("computes 100% progress when fully met", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser("r1", "Alice A", 100000, 100000)])
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard"))
    const [entry] = await res.json()
    expect(entry.progressPct).toBe(100)
    expect(entry.remaining).toBe(0)
    expect(entry.totalEarned).toBe(100000)
  })

  it("caps progress at 100% when overachieved", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser("r1", "Bob B", 50000, 80000)])
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard"))
    const [entry] = await res.json()
    expect(entry.progressPct).toBe(100)
    expect(entry.remaining).toBe(0)
  })

  it("returns 0% progress with no commissions", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser("r1", "Carol C", 50000, 0)])
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard"))
    const [entry] = await res.json()
    expect(entry.progressPct).toBe(0)
    expect(entry.remaining).toBe(50000)
    expect(entry.totalEarned).toBe(0)
  })

  it("handles recruiter with no goal (null goal, 0% progress)", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser("r1", "Dan D", 0, 5000)])
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard"))
    const [entry] = await res.json()
    expect(entry.goal).toBeNull()
    expect(entry.progressPct).toBe(0)
  })

  it("computes partial progress correctly (75%)", async () => {
    prisma.user.findMany.mockResolvedValue([makeUser("r1", "Eve E", 100000, 75000)])
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard"))
    const [entry] = await res.json()
    expect(entry.progressPct).toBe(75)
    expect(entry.remaining).toBe(25000)
  })
})

describe("Leaderboard sorting", () => {
  const { prisma } = require("@/lib/prisma")

  beforeEach(() => {
    mockAuth.mockResolvedValue(adminSession)
    prisma.user.findMany.mockResolvedValue([
      makeUser("r1", "Alice A", 100000, 80000),
      makeUser("r2", "Bob B", 50000, 50000),
    ])
  })

  it("sorts by earned descending by default", async () => {
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard?sortBy=earned"))
    const data = await res.json()
    expect(data[0].totalEarned).toBeGreaterThanOrEqual(data[1].totalEarned)
  })

  it("sorts by name alphabetically", async () => {
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard?sortBy=name"))
    const data = await res.json()
    expect(data[0].name.localeCompare(data[1].name)).toBeLessThanOrEqual(0)
  })

  it("sorts by remaining (closest to goal first)", async () => {
    const res = await getLeaderboard(new Request("http://localhost/api/dashboard/leaderboard?sortBy=remaining"))
    const data = await res.json()
    expect(data[0].remaining).toBeLessThanOrEqual(data[1].remaining)
  })
})
