import React from "react";
import Headers from "@/components/common/Header";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <Headers />
            <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
        </div>
    );
};

export default layout;
