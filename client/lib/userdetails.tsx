

async function UserDetails() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/details`, {
      method: "GET",
      credentials: "include", 
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const details = await response.json();
    console.log("User details fetched:", details);
    return details;
  } catch (err) {
    console.log("Error fetching user details:", err);
  }
}