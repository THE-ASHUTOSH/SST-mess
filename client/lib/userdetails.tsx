import axiosInstance from "./axiosInstance";
import { isAxiosError } from "axios";

async function UserDetails() {
    try {
        const response = await axiosInstance.get(`/auth/details`);
        return response.data;
    } catch (err) {
        if (isAxiosError(err) && err.response?.status === 401) {
            window.location.href = '/login';
            return;
        }
        console.log("Error fetching user details:", err);
    }
}

export { UserDetails };
