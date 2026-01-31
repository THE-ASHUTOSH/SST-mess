import Headers from "@/components/common/Header";
import Protected from "./Protected";
import { DashboardProvider } from "@/context/DashboardContext";


const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {


    return (
        <Protected>
            <DashboardProvider>
                <div className="flex flex-col h-screen overflow-hidden">
                    <Headers />
                    <main className="flex-1 overflow-auto">
                        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                            <div className="max-w-7xl mx-auto">{children}</div>
                        </div>
                    </main>
                </div>
            </DashboardProvider>
        </Protected>
    );
};

export default layout;