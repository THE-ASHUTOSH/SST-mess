import axios from "axios";

async function UserDetails() {
  try{
    const details = await axios.get("http://localhost:5000/auth/details", { withCredentials: true }).catch(err => {
    if (err.response.status === 401) {
      window.location.href = '/login';
    };
  })
  console.log("User details fetched:", details);
  return details;
}catch(err){
  console.log("Error fetching user details:", err);
}
}