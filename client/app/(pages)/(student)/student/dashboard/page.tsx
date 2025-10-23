"use client"

import { Container } from "@/components/ui/container"
import { PageTitle } from "@/components/ui/page-title"
import { api } from "@/lib/api"
import React, { useEffect, useState } from "react"
import { VendorCard } from "@/components/features/vendor/vendor-card"
import { MenuCard } from "@/components/features/menu/menu-card"
import { useData } from "@/components/providers/data-provider"
import { GridSkeleton, MenuCardSkeleton, VendorCardSkeleton } from "@/components/ui/loading-skeletons"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Menu, Vendor } from "@/types"

const DashboardPage = () => {
  const { studentData, vendors, setVendors } = useData()
  const [isLoading, setIsLoading] = useState(true)
  const [todayMenu, setTodayMenu] = useState<Menu[]>([])

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Fetch vendors and today's menu in parallel
        const [vendorsData, menuData] = await Promise.all([
          api.vendors.getAll(),
          api.menu.getToday(),
        ])

        if (vendorsData.success && menuData.success) {
          setVendors(vendorsData.data as Vendor[])
          setTodayMenu(menuData.data as Menu[])
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [setVendors])

  return (
    <Container className="py-8 animate-fade-in-up space-y-8">
      <PageTitle
        title="Student Dashboard"
        description="Manage your mess preferences and view daily menus"
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/student/selectVendor">
          <Card className="p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
              Select Mess
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Choose your preferred mess vendor
            </p>
          </Card>
        </Link>
        <Link href="/student/vendorDetails">
          <Card className="p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
              View Menu
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Check today's and weekly menu
            </p>
          </Card>
        </Link>
        <Link href="/student/feedback">
          <Card className="p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400">
              Give Feedback
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Rate and review your experience
            </p>
          </Card>
        </Link>
      </div>

      {/* Today's Menu Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          Today's Menu
        </h2>
        {isLoading ? (
          <GridSkeleton count={3} SkeletonComponent={MenuCardSkeleton} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todayMenu?.map((menu: any) => (
              <MenuCard
                key={menu.vendorId}
                day={menu.day}
                items={menu.items}
                isToday
              />
            ))}
          </div>
        )}
      </section>

      {/* Available Vendors Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
          Available Vendors
        </h2>
        {isLoading ? (
          <GridSkeleton count={3} SkeletonComponent={VendorCardSkeleton} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors?.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                isSelected={studentData.selectedVendor === vendor.id}
              />
            ))}
          </div>
        )}
      </section>
    </Container>
  )
}

export default DashboardPage