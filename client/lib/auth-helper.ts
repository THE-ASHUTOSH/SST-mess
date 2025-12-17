import { currentUser } from "@clerk/nextjs/server";
import connectDB from "./db";
import User from "./models/user.model";

// Define the User interface based on your Mongoose model
interface IUser {
    _id: string;
    email: string;
    role: 'admin' | 'student' | 'vendor';
    name: string;
    picture?: string;
    roll?: string;
    hostel?: string;
    batch?: string;
}

export async function getDbUser(): Promise<IUser | null> {
    const clerkUser = await currentUser();

    if (!clerkUser) {
        return null;
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
        return null;
    }

    await connectDB();

    const user = await User.findOne({ email }).lean();

    // If user doesn't exist in DB, we might want to create them or return null
    // Ideally we should sync them on login/signup webhooks, but for now we can create on the fly or just return null
    // Based on legacy auth.route.js, it was creating users on google callback.
    // So let's auto-create if missing to maintain that behavior.

    if (!user) {
        const newUser = new User({
            email,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
            picture: clerkUser.imageUrl,
            role: 'student', // Default role
        });
        await newUser.save();
        return newUser.toObject();
    }
    // console.log("DB User fetched:", user as unknown as IUser);
    return user as unknown as IUser;
}

export async function requireRole(allowedRoles: string[]) {
    const user = await getDbUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    if (!allowedRoles.includes(user.role)) {
        throw new Error("Forbidden");
    }

    return user;
}
