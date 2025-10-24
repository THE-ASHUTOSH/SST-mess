import React from "react";
import Headers from "@/components/common/Header";
import { VendorsInfoProvider } from "@/app/context/vendorsInfo";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <VendorsInfoProvider  vendorDetail={{name:"", price:0, menu:""}}>
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-[#1a1c2e] to-gray-950">
            <Headers />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 ">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
        </VendorsInfoProvider >
    );
};

export default layout;
