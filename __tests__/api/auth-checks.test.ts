/**
 * Auth checks — every protected route returns 401 when unauthenticated.
 */
import { GET as getUsersGET, POST as getUsersPOST } from "@/app/api/users/route"
import { GET as getCommissionsGET, POST as getCommissionsPOST } from "@/app/api/commissions/route"
import { GET as getGoalsGET, POST as getGoalsPOST } from "@/app/api/goals/route"
import { GET as getLeaderboardGET } from "@/app/api/dashboard/leaderboard/route"
import { GET as getRecruiterGET } from "@/app/api/dashboard/recruiter/route"
import { GET as getAuditLogsGET } from "@/app/api/audit-logs/route"
import { PATCH as patchPasswordPATCH } from "@/app/api/settings/password/route"

jest.mock("@/auth", () => ({ auth: jest.fn().mockResolvedValue(null) }))
jest.mock("@/lib/prisma", () => ({ prisma: {} }))

const req = (url = "http://localhost/api/test") => new Request(url)
const postReq = (url: string, body = {}) =>
  new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } })

describe("401 when unauthenticated", () => {
  it("GET /api/users", async () => {
    const res = await getUsersGET()
    expect(res.status).toBe(401)
  })

  it("POST /api/users", async () => {
    const res = await getUsersPOST(postReq("http://localhost/api/users"))
    expect(res.status).toBe(401)
  })

  it("GET /api/commissions", async () => {
    const res = await getCommissionsGET(req("http://localhost/api/commissions"))
    expect(res.status).toBe(401)
  })

  it("POST /api/commissions", async () => {
    const res = await getCommissionsPOST(postReq("http://localhost/api/commissions"))
    expect(res.status).toBe(401)
  })

  it("GET /api/goals", async () => {
    const res = await getGoalsGET(req("http://localhost/api/goals"))
    expect(res.status).toBe(401)
  })

  it("POST /api/goals", async () => {
    const res = await getGoalsPOST(postReq("http://localhost/api/goals"))
    expect(res.status).toBe(401)
  })

  it("GET /api/dashboard/leaderboard", async () => {
    const res = await getLeaderboardGET(req("http://localhost/api/dashboard/leaderboard"))
    expect(res.status).toBe(401)
  })

  it("GET /api/dashboard/recruiter", async () => {
    const res = await getRecruiterGET(req("http://localhost/api/dashboard/recruiter"))
    expect(res.status).toBe(401)
  })

  it("GET /api/audit-logs", async () => {
    const res = await getAuditLogsGET(req("http://localhost/api/audit-logs"))
    expect(res.status).toBe(401)
  })

  it("PATCH /api/settings/password", async () => {
    const res = await patchPasswordPATCH(
      new Request("http://localhost/api/settings/password", { method: "PATCH", body: JSON.stringify({}), headers: { "Content-Type": "application/json" } })
    )
    expect(res.status).toBe(401)
  })
})
