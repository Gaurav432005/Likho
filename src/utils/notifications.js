import { toast } from "react-hot-toast";

/**
 * Standardized Toast Notifications
 * Provides consistent toast messages throughout the app
 */

export const notifySuccess = (message = "Success!") => {
  toast.success(message, {
    duration: 3000,
    position: "top-center",
  });
};

export const notifyError = (message = "Something went wrong", error = null) => {
  if (error && process.env.NODE_ENV === "development") {
    console.error(message, error);
  }
  toast.error(message, {
    duration: 4000,
    position: "top-center",
  });
};

export const notifyInfo = (message = "Info") => {
  toast(message, {
    duration: 3000,
    position: "top-center",
    icon: "ℹ️",
  });
};

export const notifyLoading = (message = "Loading...") => {
  return toast.loading(message, {
    position: "top-center",
  });
};

/**
 * Common notification messages
 */
export const notificationMessages = {
  // Auth
  "auth/login-success": "Welcome back!",
  "auth/signup-success": "Account created! Please verify your email.",
  "auth/logout-success": "Logged out successfully",
  "auth/password-reset-sent": "Password reset link sent to your email",
  
  // Posts
  "post/created": "Post published successfully!",
  "post/updated": "Post updated successfully!",
  "post/deleted": "Post deleted successfully",
  "post/delete-failed": "Failed to delete post",
  
  // Comments
  "comment/added": "Comment added!",
  "comment/deleted": "Comment deleted",
  
  // Likes
  "like/added": "Liked!",
  "like/removed": "Unliked",
  
  // Diary
  "diary/created": "Entry saved to diary",
  "diary/updated": "Diary entry updated",
  "diary/deleted": "Entry deleted from diary",
  
  // Profile
  "profile/updated": "Profile updated successfully",
  "profile/photo-updated": "Profile photo updated",
  
  // Chat
  "chat/message-sent": "Message sent",
  "chat/message-failed": "Failed to send message",
  
  // General
  "error/network": "Network error. Please check your connection.",
  "error/unauthorized": "You are not authorized to perform this action",
  "error/permission-denied": "Permission denied",
  "error/not-found": "Resource not found",
  "loading/please-wait": "Please wait...",
};

/**
 * Toast with custom HTML (for special cases)
 */
export const notifyCustom = (component, options = {}) => {
  return toast.custom(component, {
    duration: 4000,
    position: "top-center",
    ...options,
  });
};
