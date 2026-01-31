import Headers from "@/components/common/Header";
import Protected from "./Protected";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    return (
        <Protected>
            <div className="flex flex-col h-screen overflow-hidden">
                <Headers />
                <main className="flex-1 overflow-auto">
                    <div className="container mx-auto px-4 py-6">{children}</div>
                </main>
            </div>
        </Protected>
    );
};

export default layout;