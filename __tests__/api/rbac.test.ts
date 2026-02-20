/**
 * RBAC — recruiter cannot access admin-only endpoints.
 */
import { GET as getUsersGET, POST as getUsersPOST } from "@/app/api/users/route"
import { POST as getCommissionsPOST } from "@/app/api/commissions/route"
import { GET as getLeaderboardGET } from "@/app/api/dashboard/leaderboard/route"
import { GET as getAuditLogsGET } from "@/app/api/audit-logs/route"

const mockAuth = jest.fn()
jest.mock("@/auth", () => ({ auth: (...args: unknown[]) => mockAuth(...args) }))
jest.mock("@/lib/prisma", () => ({ prisma: {} }))

const recruiterSession = {
  user: { id: "recruiter-1", email: "r@test.com", role: "RECRUITER", name: "Test Recruiter" },
}

const req = (url: string) => new Request(url)
const postReq = (url: string, body = {}) =>
  new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } })

describe("403 when recruiter hits admin-only endpoints", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(recruiterSession)
  })

  it("GET /api/users → 403", async () => {
    const res = await getUsersGET()
    expect(res.status).toBe(403)
  })

  it("POST /api/users → 403", async () => {
    const res = await getUsersPOST(postReq("http://localhost/api/users"))
    expect(res.status).toBe(403)
  })

  it("POST /api/commissions → 403", async () => {
    const res = await getCommissionsPOST(postReq("http://localhost/api/commissions"))
    expect(res.status).toBe(403)
  })

  it("GET /api/dashboard/leaderboard → 403", async () => {
    const res = await getLeaderboardGET(req("http://localhost/api/dashboard/leaderboard"))
    expect(res.status).toBe(403)
  })

  it("GET /api/audit-logs → 403", async () => {
    const res = await getAuditLogsGET(req("http://localhost/api/audit-logs"))
    expect(res.status).toBe(403)
  })
})

describe("recruiter can access own data", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(recruiterSession)
  })

  it("GET /api/commissions (own data) → not 403", async () => {
    // Mock prisma to return empty array for recruiter's own commissions
    const { prisma } = require("@/lib/prisma")
    prisma.commission = { findMany: jest.fn().mockResolvedValue([]) }

    const res = await (await import("@/app/api/commissions/route")).GET(
      req("http://localhost/api/commissions")
    )
    expect(res.status).not.toBe(403)
    expect(res.status).not.toBe(401)
  })
})

describe("recruiter CANNOT see another recruiter's commissions", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(recruiterSession)
  })

  it("GET /api/commissions?recruiterId=other-id → 403", async () => {
    const res = await (await import("@/app/api/commissions/route")).GET(
      req("http://localhost/api/commissions?recruiterId=other-recruiter-999")
    )
    expect(res.status).toBe(403)
  })
})
