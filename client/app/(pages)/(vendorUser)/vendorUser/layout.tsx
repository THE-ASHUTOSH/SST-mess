import Headers from "@/components/common/Header";
import Protected from "./Protected";

const layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    return (
        <Protected>
            <div className="flex flex-col min-h-screen">
                <Headers />
                <main className="flex-grow container mx-auto px-4 py-8">{children}</main>
            </div>
        </Protected>
    );
};

export default layout;