import React from 'react'
import EventCard from '@/components/common/EventCard'

const Dashboard = () => {
   return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 tracking-tight transform hover:scale-105 transition-transform duration-300">Vendor Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        <EventCard title="Verify Student QR" redirectUrl="/vendorUser/verifyStudentQR">
          <p>Verify the QR code of a student</p>
        </EventCard>
        <EventCard title="Choice Analysis" redirectUrl="/vendorUser/choiceAnalysis">
          <p>Analyze the choices made for vendors</p>
        </EventCard>
      </div>
    </div>
  )
}

export default Dashboard