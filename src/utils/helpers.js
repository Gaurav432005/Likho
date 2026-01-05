/**
 * Common validation functions
 */

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateName = (name) => {
  return name.trim().length >= 2;
};

export const validateBio = (bio) => {
  return bio.length <= 200;
};

export const validatePostContent = (content) => {
  if (!content.trim()) return { valid: false, error: "Content cannot be empty" };
  if (content.length > 5000) return { valid: false, error: "Content must be less than 5000 characters" };
  return { valid: true };
};

/**
 * Common Firebase error messages
 */
export const getFirebaseErrorMessage = (code) => {
  const errorMap = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email already registered. Try login.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password too short (min 6 chars).',
    'auth/too-many-requests': 'Too many attempts. Wait a moment.',
    'auth/popup-closed-by-user': 'Sign in cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested resource was not found.',
  };
  
  return errorMap[code] || 'Something went wrong. Please try again.';
};

/**
 * Format timestamp to readable date
 */
export const formatDate = (timestamp) => {
  if (!timestamp?.seconds) return 'Just now';
  
  const date = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

/**
 * Truncate text
 */
export const truncate = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = (json, defaultValue = null) => {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error('JSON parse error:', e);
    return defaultValue;
  }
};
