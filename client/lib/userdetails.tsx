import { getToken } from "./auth";

// async function UserDetails() {
//   try {
//     const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/details`, {
//       method: "GET",
//       credentials: "include", 
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });

//     if (response.status === 401) {
//       window.location.href = '/login';
//       return;
//     }

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const details = await response.json();
//     // console.log("User details fetched:", details);
//     return details;
//   } catch (err) {
//     // console.log("Error fetching user details:", err);
//   }
// }


async function UserDetails() {
    try {
        const token = getToken();
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/details`, {
            method: "GET",
            headers,
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const details = await response.json();
        return details;
    } catch (err) {
        console.log("Error fetching user details:", err);
    }
}

export { UserDetails };