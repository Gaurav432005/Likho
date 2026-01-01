import { Link, useLocation } from "react-router-dom";
import { FaHome, FaPlusCircle, FaBook, FaEnvelope, FaBars } from "react-icons/fa";
import { useNotification } from "../../context/NotificationContext";

export const BottomNav = ({ onOpenMenu }) => {
  const location = useLocation();
  const { hasUnreadMessage } = useNotification();

  const isActive = (path) => {
    if (path === '/chat') return location.pathname.startsWith('/chat');
    return location.pathname === path;
  }

  const navItems = [
    { path: "/", icon: <FaHome size={22} />, label: "Home" },
    { path: "/diary", icon: <FaBook size={20} />, label: "Diary" },
    { path: "/create", icon: <FaPlusCircle size={38} />, label: "Post", isSpecial: true },
    { path: "/chat", icon: <FaEnvelope size={22} />, label: "Chat", hasBadge: hasUnreadMessage },

    { path: "#menu", icon: <FaBars size={22} />, label: "Menu", isTrigger: true },
  ];

  return (
    <nav className="bg-white border-t border-slate-200 px-6 py-2  flex justify-between items-end h-16 z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.03)]">
      {navItems.map((item) => {
        if (item.isTrigger) {
          return (
            <button key={item.label} onClick={onOpenMenu} className="flex flex-col items-center gap-1 mb-2 text-slate-400 hover:text-slate-900 transition-colors">
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        }
        return (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 transition-all duration-200 mb-2 ${item.isSpecial ? "text-white -mt-8 bg-slate-900 p-1 rounded-full shadow-xl shadow-slate-900/30 ring-4 ring-white" : ""} ${!item.isSpecial && isActive(item.path) ? "text-slate-900 scale-110" : "text-slate-400"}`}>
            <div className="relative">
              {item.icon}
              {item.hasBadge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white "></span>}
            </div>
            {!item.isSpecial && <span className="text-[10px] font-bold">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
};