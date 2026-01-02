import { Link, useLocation } from "react-router-dom";
import { FaHome, FaPlusCircle, FaBook, FaEnvelope, FaUser } from "react-icons/fa";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext"; //

export const BottomNav = () => { // Removed onOpenMenu prop as it's no longer needed
  const location = useLocation();
  const { hasUnreadMessage } = useNotification();
  const { user } = useAuth(); // Get user to link to profile

  const isActive = (path) => {
    if (path === '/chat') return location.pathname.startsWith('/chat');
    // Check if the current path matches the link path exactly
    return location.pathname === path;
  }

  const navItems = [
    { path: "/", icon: <FaHome size={22} />, label: "Home" },
    { path: "/diary", icon: <FaBook size={20} />, label: "Diary" },
    { path: "/create", icon: <FaPlusCircle size={38} />, label: "Post", isSpecial: true },
    { path: "/chat", icon: <FaEnvelope size={22} />, label: "Chat", hasBadge: hasUnreadMessage },
    // Replaced Menu with Profile link directly
    { path: `/profile/${user?.uid}`, icon: <FaUser size={20} />, label: "Profile" }, 
  ];

  return (
    <nav className="bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-end h-16 z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.03)]">
      {navItems.map((item) => {
        return (
          <Link 
            key={item.label} // Changed key to label since path is dynamic for profile
            to={item.path} 
            className={`flex flex-col items-center gap-1 transition-all duration-200 mb-2 ${
              item.isSpecial 
                ? "text-white -mt-8 bg-slate-900 p-1 rounded-full shadow-xl shadow-slate-900/30 ring-4 ring-white" 
                : ""
            } ${
              !item.isSpecial && isActive(item.path) 
                ? "text-slate-900 scale-110" 
                : "text-slate-400"
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.hasBadge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white"></span>}
            </div>
            {!item.isSpecial && <span className="text-[10px] font-bold">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
};