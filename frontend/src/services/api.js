/**
 * A wrapper around native fetch that defaults to including credentials (cookies)
 * and sets the Content-Type to JSON.
 */
export async function apiFetch(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Crucial for sending/receiving HttpOnly cookies across origins/proxies
    credentials: 'include',
  };

  // Stringify the body if it's an object and not already stringified
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  // Use the Vite proxy (which routes /api to Django on port 8000)
  const response = await fetch(endpoint, config);

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore if response is not JSON
    }
    const error = new Error(errorData.detail || 'An error occurred during the request');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
