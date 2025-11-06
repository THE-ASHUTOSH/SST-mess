import React from 'react'
import EventCard from '@/components/common/EventCard'

const Dashboard = () => {
   return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        <EventCard title="Update Vendor Menu" redirectUrl="/admin/updateVendorMenu">
          <p>Update the menu, price and other details of a vendor</p>
        </EventCard>
        <EventCard title="Add Vendor" redirectUrl="/admin/addVendor">
            <p>Add a new vendor to the system</p>
        </EventCard>
        <EventCard title="Choice Analysis" redirectUrl="/admin/choiceAnalysis">
            <p>Analyze the choices made for vendors</p>
        </EventCard>
        <EventCard title="FeedBack Analysis" redirectUrl="/admin/feedBackAnalysis">
            <p>Analyze the feedback received for vendors</p>
        </EventCard>
        
    
      </div>
    </div>
  )
}

export default Dashboard