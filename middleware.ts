import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Public routes that don't require authentication
        const publicRoutes = ['/login', '/signup', '/billing']
        if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
          return true
        }

        // Public API routes - webhook must be accessible without auth
        if (pathname.startsWith('/api/auth/') || pathname === '/api/billing/webhook' || pathname.startsWith('/api/billing/webhook')) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/vehicles/:path*',
    '/maintenance/:path*',
    '/admin/:path*',
    '/calendar/:path*',
    '/settings/:path*',
    // Match API routes but exclude webhook
    '/api/:path((?!billing/webhook).*)',
    '/login',
    '/signup',
    '/billing',
  ],
}


