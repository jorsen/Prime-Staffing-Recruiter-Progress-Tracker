import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role as string
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === "/login"
      const isDashboard = nextUrl.pathname.startsWith("/dashboard")
      const isAdminRoute =
        nextUrl.pathname.startsWith("/dashboard/leaderboard") ||
        nextUrl.pathname.startsWith("/dashboard/users") ||
        nextUrl.pathname.startsWith("/dashboard/audit-logs")

      if (!isLoggedIn && isDashboard) return false
      if (isLoggedIn && isLoginPage) return Response.redirect(
        new URL(
          auth?.user?.role === "ADMIN" || auth?.user?.role === "SUPERADMIN"
            ? "/dashboard/leaderboard"
            : "/dashboard/recruiter",
          nextUrl
        )
      )
      if (isAdminRoute && auth?.user?.role !== "ADMIN" && auth?.user?.role !== "SUPERADMIN") return Response.redirect(
        new URL("/dashboard/recruiter", nextUrl)
      )

      return true
    },
  },
  providers: [],
}
