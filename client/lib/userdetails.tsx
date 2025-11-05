

async function UserDetails() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verifyanddetails`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      // Not authenticated
      return { user: null, status: 401 };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const details = await response.json();
    return details;
  } catch (err) {
    console.error("Error fetching user details:", err);
    return { user: null, error: err };
  }
}