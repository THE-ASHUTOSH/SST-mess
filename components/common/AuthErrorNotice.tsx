"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import type { AuthErrorInfo } from "@/lib/auth-errors";

interface AuthErrorNoticeProps {
    error: AuthErrorInfo;
    className?: string;
}

/** Shared failure card for the sign-in flow — used by /login and /login/sso-callback. */
const AuthErrorNotice: React.FC<AuthErrorNoticeProps> = ({ error, className }) => {
    return (
        <div
            role="alert"
            className={`w-full rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-left ${className ?? ""}`}
        >
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-destructive">{error.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {error.message}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground/70 break-all">
                        {error.code}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthErrorNotice;
