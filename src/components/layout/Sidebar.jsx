import { Link, useLocation } from "react-router-dom";
import { FaHome, FaPenNib, FaFeatherAlt, FaBook, FaEnvelope, FaUser, FaSignOutAlt, FaCompass } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../lib/firebase";
import { useNotification } from "../../context/NotificationContext";
import { Avatar } from "../ui/Avatar"; 

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { hasUnreadMessage } = useNotification();
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/" || (location.pathname.startsWith("/view/posts") && !location.pathname.includes("diary"));
    if (path === "/diary") return location.pathname === "/diary" || location.pathname.includes("/view/diary");
    if (path === "/discover") return location.pathname === "/discover";
    if (path === "/chat") return location.pathname.startsWith("/chat");
    if (path.startsWith("/profile")) return location.pathname === path;
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", name: "Home ", icon: <FaHome size={18} /> },
    { path: "/discover", name: "Discover", icon: <FaCompass size={18} /> },
    { path: "/diary", name: "My Diary", icon: <FaBook size={18} /> },
    { path: "/create", name: "Write New", icon: <FaPenNib size={18} /> },
    { path: "/chat", name: "Messages", icon: <FaEnvelope size={18} />, hasBadge: hasUnreadMessage },
    { path: `/profile/${user?.uid}`, name: "My Profile", icon: <FaUser size={18} /> },
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300 ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}`} 
        onClick={onClose} 
      />
      
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-200 ease-spring ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex flex-col shadow-2xl md:shadow-none`}>
  
        <div className="h-20 border-b border-slate-200 flex items-center gap-3 px-6">
           <div className="w-10 h-10 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-200 font-bold">
              L
           </div>
           <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Likho</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
        
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-semibold text-sm group
                  ${active 
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-200" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
              >
                <div className="relative">
                    {item.icon}
                    {item.hasBadge && <span className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
                </div>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 h-24 border-t border-slate-200 flex flex-col items-center justify-center gap-3">
            <Link to={`/profile/${user?.uid}`} onClick={onClose} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 transition-colors group">
                <Avatar src={user?.photoURL} name={user?.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName}</p>
                    <p className="text-xs text-slate-500">Profile</p>
                </div>
            </Link>
            <button 
                onClick={() => auth.signOut()} 
                className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors font-semibold text-sm" 
            >
                <FaSignOutAlt /> Logout
            </button>
        </div>
      </aside>
    </>
  );
};