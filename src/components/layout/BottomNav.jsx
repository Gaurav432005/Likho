import { Link, useLocation } from "react-router-dom";
import { FaHome, FaPlusCircle, FaBook, FaEnvelope, FaUser, FaCompass } from "react-icons/fa";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";

export const BottomNav = () => {
  const location = useLocation();
  const { hasUnreadMessage } = useNotification();
  const { user } = useAuth();

  const isActive = (path) => {
    if (path === '/chat') return location.pathname.startsWith('/chat');
    if (path === '/discover') return location.pathname === '/discover';
    return location.pathname === path;
  }

  const navItems = [
    { path: "/", icon: <FaHome size={22} />, label: "Home" },
    { path: "/discover", icon: <FaCompass size={22} />, label: "Discover" },
    { path: "/create", icon: <FaPlusCircle size={40} />, label: "Post", isSpecial: true },
    { path: "/chat", icon: <FaEnvelope size={22} />, label: "Chat", hasBadge: hasUnreadMessage },
    { path: `/profile/${user?.uid}`, icon: <FaUser size={22} />, label: "Profile" }, 
  ];

  return (
    <nav className="bg-white border-t border-slate-200 px-3 py-2 flex justify-between items-end h-20 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      {navItems.map((item) => {
        return (
          <Link 
            key={item.label}
            to={item.path} 
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              item.isSpecial 
                ? "text-white -mt-10 bg-primary-600 p-2 rounded-full shadow-lg shadow-primary-300 ring-4 ring-white hover:bg-primary-700" 
                : ""
            } ${
              !item.isSpecial && isActive(item.path) 
                ? "text-primary-600 scale-110" 
                : !item.isSpecial ? "text-slate-500" : ""
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.hasBadge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
            </div>
            {!item.isSpecial && <span className="text-[11px] font-semibold">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
};