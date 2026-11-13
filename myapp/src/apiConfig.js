// Centralized API configuration for local and deployed environments
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export default API_BASE_URL;
