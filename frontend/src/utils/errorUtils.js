/**
 * Safely parses API error objects from Axios responses into a human-readable string.
 * @param {Error|Object} error - The Axios error object or API error payload
 * @param {string} fallbackMsg - Fallback string if parsing fails
 * @returns {string} Human-readable error message
 */
export function parseApiError(error, fallbackMsg = 'An unexpected error occurred. Please try again.') {
  if (!error) return fallbackMsg;
  if (typeof error === 'string') return error;

  const data = error.response?.data;
  if (!data) {
    if (error.message && typeof error.message === 'string') {
      if (error.message === 'Network Error') return 'Unable to connect to the server. Please check your internet connection.';
      return error.message;
    }
    return fallbackMsg;
  }

  if (typeof data === 'string') {
    if (data.includes('token') || data.includes('Token')) return 'Your session has expired. Please sign in again.';
    return data;
  }
  if (data.detail && typeof data.detail === 'string') {
    const detailLower = data.detail.toLowerCase();
    if (detailLower.includes('token not valid') || detailLower.includes('token is invalid') || detailLower.includes('token_not_valid') || detailLower.includes('given token')) {
      return 'Your session has expired. Please sign in again.';
    }
    return data.detail;
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const firstVal = data[firstKey];
      const fieldPrefix = firstKey !== 'non_field_errors' && firstKey !== 'detail'
        ? `${firstKey.replace(/_/g, ' ')}: `
        : '';

      if (Array.isArray(firstVal) && firstVal.length > 0) {
        return `${fieldPrefix}${firstVal[0]}`;
      }
      if (typeof firstVal === 'string') {
        return `${fieldPrefix}${firstVal}`;
      }
    }
  }

  return fallbackMsg;
}
