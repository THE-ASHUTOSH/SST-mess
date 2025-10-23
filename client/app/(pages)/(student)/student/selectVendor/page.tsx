"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'

const SelectVendor = () => {
  const [formData, setFormData] = useState({
    name: '',
    room: '',
    mess: ''
  })

  const [showMessage, setShowMessage] = useState(false)

  const messOptions = [
    { value: 'mess1', label: 'Mess A - Vegetarian' },
    { value: 'mess2', label: 'Mess B - Non-Vegetarian' },
    { value: 'mess3', label: 'Mess C - Mixed' }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'mess') {
      setShowMessage(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in-up">
      <Card className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg">
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
            Select Your Mess
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-300">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="room" className="text-sm font-medium text-gray-300">
                Room Number
              </label>
              <input
                type="text"
                id="room"
                name="room"
                value={formData.room}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Enter your room number"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="mess" className="text-sm font-medium text-gray-300">
                Select Mess
              </label>
              <select
                id="mess"
                name="mess"
                value={formData.mess}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300 text-white placeholder-gray-500"
                required
              >
                <option value="">Select a mess</option>
                {messOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {showMessage && formData.mess && (
              <div className="py-3 px-4 rounded-lg bg-blue-500/10 border border-blue-500/20 animate-fade-in">
                <p className="text-sm text-blue-400">
                  You have selected {messOptions.find(opt => opt.value === formData.mess)?.label}. 
                  Please ensure this is your final choice as it cannot be changed later.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              Submit Selection
            </button>
          </form>
        </div>
      </Card>
    </div>
  )
}

export default SelectVendor