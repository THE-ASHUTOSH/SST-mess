import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isApiRoute = createRouteMatcher(['/api/(.*)'])

// The sign-in surface. A visitor with a live session has no business seeing a login form.
const isLoginRoute = createRouteMatcher(['/login', '/login/(.*)'])

// The OAuth handshake completes here and needs the page to render even though a session may
// already exist — redirecting it away would break sign-in.
const isSsoCallback = createRouteMatcher(['/login/sso-callback'])

/**
 * Bare section roots and moved routes. These were server components calling `redirect()`, but they
 * sit under `"use client"` layouts whose shell streams first — so by the time the page threw, the
 * headers were gone and the redirect degraded into a client-side navigation (verified: `/student`
 * and `/admin` answered 200 with NEXT_REDIRECT in the body). Handling them here runs before any
 * render, so they are real 307s with nothing painted.
 */
const SECTION_REDIRECTS: Record<string, string> = {
    '/student': '/student/dashboard',
    '/student/getFood': '/student/dashboard',
    '/admin': '/admin/dashboard',
    '/vendorUser': '/vendorUser/dashboard',
}

export default clerkMiddleware(async (auth, request) => {
    if (isApiRoute(request)) {
        await auth.protect()
        return
    }

    const target = SECTION_REDIRECTS[request.nextUrl.pathname]
    if (target) {
        return NextResponse.redirect(new URL(target, request.url))
    }

    if (!isLoginRoute(request) || isSsoCallback(request)) {
        return
    }

    // Explicit arrivals must not be bounced:
    //  - `?error=`     we sent them here to read a message (unregistered, wrong domain)
    //  - `?signedOut=` they just logged out. The session cookie can still look live for a moment,
    //                  and bouncing to /authCallback in that window sends them back to a dashboard
    //                  they are leaving, which then bounces to /login again — navigation churn
    //                  during the logout render.
    const params = request.nextUrl.searchParams
    if (params.has('error') || params.has('signedOut')) {
        return
    }

    // Already signed in: resolve the destination server-side instead of letting the login page
    // mount, load clerk-js, fetch /api/user/me and only then redirect. This runs before any HTML
    // is sent, so there is nothing to flash.
    const { userId } = await auth()
    if (userId) {
        return NextResponse.redirect(new URL('/authCallback', request.url))
    }
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}
