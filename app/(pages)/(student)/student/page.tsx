import { redirect } from 'next/navigation'

// `middleware.ts` normally catches /student before this renders. Kept as a fallback.
// The path MUST be absolute: 'student/dashboard' is resolved relative to the current URL, so it
// only happened to work from /student and would have produced /student/student/dashboard from
// anywhere nested.
const page = () => {
  redirect('/student/dashboard')
}

export default page
