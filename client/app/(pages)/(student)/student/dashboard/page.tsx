import React from 'react'
import EventCard from '@/components/common/EventCard'

const dashboard = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">

        <EventCard title="Menu" redirectUrl="/student/vendorDetails">
          <p>get the menu of all the vendors here</p>
        </EventCard>
        <EventCard title="Select Vendor" redirectUrl="/student/selectVendor">
            <p>Select the vendor you want to order from</p>
        </EventCard>
        <EventCard title="Feedback" redirectUrl="/student/feedback">
            <p>Your feedback is very important to us</p>
        </EventCard>
        
    
      </div>
    </div>
  )
}

export default dashboard