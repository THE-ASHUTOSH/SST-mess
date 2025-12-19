import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define routes that should be protected
// const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/profile(.*)'])
// For now, let's protect everything except public routes if needed, 
// but typically we allow public access and protect in API/Components.
// However, existing app might have been fully protected.
// Let's just use default which protects nothing by default unless specified, 
// or protect specific paths.
// Given strict "backend migration", let's protect API routes.

const isApiRoute = createRouteMatcher(['/api/(.*)'])

export default clerkMiddleware(async (auth, request) => {
    if (isApiRoute(request)) {
        await auth.protect()
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
