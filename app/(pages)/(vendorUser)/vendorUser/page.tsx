import { redirect } from 'next/navigation'

// `middleware.ts` normally catches /vendorUser before this renders. Kept as a fallback.
// Was a client component redirecting from a useEffect, which meant shipping JS and painting a blank
// page before navigating; a server redirect needs neither.
const VendorPage = () => {
  redirect('/vendorUser/dashboard')
}

export default VendorPage
