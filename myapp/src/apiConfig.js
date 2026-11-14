// Centralized API configuration for local and deployed environments
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? `http://${window.location.hostname}:5000`
    : "https://foodie-ai-backend-qyun.onrender.com"
);

export default API_BASE_URL;
