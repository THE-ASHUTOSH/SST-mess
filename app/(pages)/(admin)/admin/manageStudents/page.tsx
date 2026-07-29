"use client";

import React, { useState } from "react";
import { Upload, Users, type LucideIcon } from "lucide-react";
import PageHeader from "@/components/common/layout/PageHeader";
import { cn } from "@/lib/utils";
import RequireRole from "../RequireRole";
import { StudentDirectory } from "./StudentDirectory";
import { BulkUploadPanel } from "./BulkUploadPanel";

type Tab = "directory" | "upload";

const TabButton = ({
    active,
    onClick,
    icon: Icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    children: React.ReactNode;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
            "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
            active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
    >
        <Icon className="h-4 w-4" />
        {children}
    </button>
);

const ManageStudentsPage = () => {
    const [tab, setTab] = useState<Tab>("directory");

    return (
        <div className="flex flex-col gap-4">
            <PageHeader
                title="Manage Students"
                description="Browse opt-ins by month, change or remove a student's vendor, view meal history, or bulk-upload selections."
            />

            <div className="inline-flex w-fit rounded-lg bg-muted p-1">
                <TabButton active={tab === "directory"} onClick={() => setTab("directory")} icon={Users}>
                    Directory
                </TabButton>
                <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={Upload}>
                    Bulk upload
                </TabButton>
            </div>

            {tab === "directory" ? <StudentDirectory /> : <BulkUploadPanel />}
        </div>
    );
};

export default function Page() {
    return (
        <RequireRole roles={["superAdmin"]}>
            <ManageStudentsPage />
        </RequireRole>
    );
}
