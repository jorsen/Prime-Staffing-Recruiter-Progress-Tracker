TIMELINE: 3-4 weeks | TECH: Next.js 14, PostgreSQL, Prisma ORM, Tailwind CSS, shadcn/ui, NextAuth.js

RECRUITER FEATURES
• Login/logout with email/password
• Set financial goal for period (e.g., "$50k this quarter")
• Log commissions with amounts and dates
• Dashboard showing: goal, earned, remaining, progress bar (%), days left
• View commission history
• Change password

MANAGER/ADMIN FEATURES
• View leaderboard of all recruiters
• Sort: By earned $, % complete, remaining $, name
• Filter: All, active only, by period
• Drill down to individual recruiter details
• User management: Create, edit, deactivate
• View audit logs

CRITICAL: ROLE-BASED ACCESS CONTROL (RBAC)
• Recruiters see ONLY their own data
• Recruiters CANNOT see leaderboard or peer data
• Managers see EVERYTHING
• Every API endpoint MUST check user.role
• Enforce strict access control

DATABASE SCHEMA
Users: id, email (UNIQUE), password_hash (bcrypted), firstName, lastName, role (recruiter|admin), commissionRate, status (active|inactive), timestamps

Goals: id, recruiterId (FK), amount (the goal $), periodStart, periodEnd, timestamps

Commissions: id, recruiterId (FK), amount (DECIMAL), loggedById (FK), notes, loggedDate, timestamps

API ENDPOINTS
Auth: POST /api/auth/login, /logout, /refresh-token, /register (admin-only)

Goals: POST /api/goals, GET /api/goals/:recruiterId

Commissions: POST /api/commissions, GET /api/commissions?recruiterId=X, DELETE /api/commissions/:id (admin-only)

Users (admin-only): GET /api/users, GET /api/users/:id, PATCH /api/users/:id, DELETE /api/users/:id (soft delete)

Dashboard: GET /api/dashboard/recruiter?periodStart=X&periodEnd=X, GET /api/dashboard/leaderboard (admin-only)

TECH STACK
Frontend: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, TanStack Query, NextAuth.js, Recharts, Vercel

Backend: Next.js API Routes, PostgreSQL, Prisma ORM, jsonwebtoken (JWT), bcryptjs (hashing), Zod (validation)

CRITICAL CHECKLIST
✓ Password hashing with bcryptjs
✓ JWT tokens (30-minute expiry)
✓ RBAC checks on EVERY endpoint
✓ Soft deletes (set deletedAt, dont actually remove)
✓ Zod input validation
✓ Error handling with try/catch
✓ Date calculations for goals
✓ Mobile responsive design
✓ Database indexes on key columns

SETUP STEPS
1. npx create-next-app@latest prime-staffing --typescript --tailwind
2. pnpm install prisma @prisma/client next-auth jsonwebtoken zod react-hook-form bcryptjs recharts
3. Create PostgreSQL database, add URL to .env.local
4. Create Prisma schema and run: npx prisma migrate dev --name init
5. Configure .env.local (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET)
6. Implement NextAuth.js configuration
7. Build API routes (auth, goals, commissions, users, dashboard)
8. Build frontend pages (login, recruiter dashboard, admin leaderboard, user management, settings)
9. Write tests (aim for >80% code coverage)
10. Deploy to Vercel

PAGES
/login (public)
/dashboard/recruiter (protected, recruiter role)
/dashboard/leaderboard (protected, admin role only)
/dashboard/users (protected, admin role only)
/dashboard/settings (protected)

This is a well-scoped, achievable project for 3-4 weeks. Start with auth, build recruiter dashboard, then admin leaderboard. Test as you go. You have everything needed to succeed! 🚀

---

DECISIONS SUMMARY TABLE
Review these before writing any code. Column A = what the PRD said. Column B = final decision.

| Topic                  | What PRD Said                                              | Final Decision                                                              |
|------------------------|------------------------------------------------------------|-----------------------------------------------------------------------------|
| Auth System            | NextAuth.js + jsonwebtoken + /refresh-token endpoint       | NextAuth.js only. Drop jsonwebtoken and refresh-token endpoint.             |
| JWT Expiry             | 30-minute JWT expiry                                       | Let NextAuth manage session expiry. No manual JWT config needed.            |
| Who Logs Commissions   | loggedById on Commissions (unclear who)                    | Admin only. Recruiters cannot log their own commissions.                    |
| commissionRate Field   | Listed on Users schema, no usage defined                   | Display only. Stored on profile, not used in auto-calculation.              |
| Goals Per Recruiter    | No constraint defined, schema allows multiple              | One active goal per recruiter at a time. Close old goal before creating new.|
| Soft Deletes           | Mentioned in checklist but deletedAt missing from schema   | Add deletedAt to Users, Goals, Commissions tables explicitly.               |
| Audit Logs             | "View audit logs" listed but no table defined              | Log 4 actions only: commission created, commission deleted, goal created, user status changed. Add AuditLogs table. |
| Active Filter          | "Filter: active only" — active never defined               | Active = user status is active AND has a goal in the current period.        |
| Package Manager        | npx on line 1 of setup, pnpm on line 2                     | pnpm throughout. Use: pnpm create next-app@latest                           |
| Install Command        | TanStack Query listed in stack but missing from install    | Add @tanstack/react-query to install command.                               |
| Test Coverage          | >80% code coverage, no type specified                      | Jest on API routes only. Focus on auth checks, RBAC, dashboard math.        |
| Commission Logging (Recruiter Feature line 6) | "Log commissions with amounts and dates" | Removed from recruiter features. Admin-only action.                |
| Database Indexes       | "Database indexes on key columns" — no specifics           | Index: Users.email, Goals.recruiterId, Commissions.recruiterId, Commissions.loggedDate. |