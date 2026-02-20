/**
 * Goals API — one-active-goal enforcement + date validation.
 */
import { POST as createGoal } from "@/app/api/goals/route"

const mockAuth = jest.fn()
jest.mock("@/auth", () => ({ auth: (...args: unknown[]) => mockAuth(...args) }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    goal: { findFirst: jest.fn(), create: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

const recruiterSession = {
  user: { id: "recruiter-1", email: "r@test.com", role: "RECRUITER", name: "Test Recruiter" },
}

const postReq = (body: object) =>
  new Request("http://localhost/api/goals", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/goals", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { prisma } = require("@/lib/prisma")

  beforeEach(() => {
    mockAuth.mockResolvedValue(recruiterSession)
    prisma.goal.findFirst.mockResolvedValue(null)
    prisma.goal.create.mockResolvedValue({ id: "goal-1", recruiterId: "recruiter-1", amount: 50000 })
    prisma.auditLog.create.mockResolvedValue({})
  })

  it("creates goal when no active goal exists", async () => {
    const res = await createGoal(
      postReq({ amount: 50000, periodStart: "2026-01-01", periodEnd: "2026-03-31" })
    )
    expect(res.status).toBe(201)
  })

  it("rejects when active goal already exists (409)", async () => {
    prisma.goal.findFirst.mockResolvedValue({ id: "existing-goal", periodEnd: new Date("2026-12-31") })
    const res = await createGoal(
      postReq({ amount: 60000, periodStart: "2026-04-01", periodEnd: "2026-06-30" })
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/active goal/i)
  })

  it("rejects when end date is before start date (400)", async () => {
    const res = await createGoal(
      postReq({ amount: 50000, periodStart: "2026-06-01", periodEnd: "2026-01-01" })
    )
    expect(res.status).toBe(400)
  })

  it("rejects when amount is zero (400)", async () => {
    const res = await createGoal(
      postReq({ amount: 0, periodStart: "2026-01-01", periodEnd: "2026-03-31" })
    )
    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await createGoal(
      postReq({ amount: 50000, periodStart: "2026-01-01", periodEnd: "2026-03-31" })
    )
    expect(res.status).toBe(401)
  })
})
