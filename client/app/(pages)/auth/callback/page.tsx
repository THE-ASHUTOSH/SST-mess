import { Suspense } from "react";
import AuthPage from "./AuthPage";

export default function CallbackPage() {
    return (
        <Suspense fallback={<h1>Redirecting...</h1>}>
            <AuthPage />
        </Suspense>
    );
}
