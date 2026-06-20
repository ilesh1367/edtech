// Detect the backend base URL dynamically
// If the app is served via Nginx (reverse proxy), it will use the current host.
// Otherwise, it falls back to your local development environment.
const getBaseUrl = () => {
  // If we are in development, use your local proxy or Vite env
  if (window.location.hostname === 'localhost') {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }
  // In production, the backend is likely on the same host (VPS IP/Domain)
  // We point the API to the same server, but on port 3000
  return window.location.origin + '/api';
};

const BASE_URL = getBaseUrl();

export const fetchAPI = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  // Ensure headers exists
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type if we aren't sending FormData (which needs custom boundaries)
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      throw new Error(data?.error || data || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
};
