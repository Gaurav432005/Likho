import { Link, useLocation } from "react-router-dom";
import { FaHome, FaPenNib, FaFeatherAlt, FaBook, FaEnvelope, FaUser, FaSignOutAlt } from "react-icons/fa";
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
    if (path === "/chat") return location.pathname.startsWith("/chat");
    if (path.startsWith("/profile")) return location.pathname === path;
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", name: "Home ", icon: <FaHome size={18} /> },
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
  
        <div className="h-20 border-b border-slate-100 flex items-center gap-4 px-8">
           <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
              <FaFeatherAlt className="text-lg" />
           </div>
           <div>
               <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">Likho</h1>
               
           </div>
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
                  w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-200 font-semibold text-sm group
                  ${active 
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-2" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1"
                  }
                `}
              >
                <div className={`relative ${active ? "text-white" : "text-slate-400 group-hover:text-slate-900"}`}>
                    {item.icon}
                    {item.hasBadge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white "></span>}
                </div>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 h-20 border-t border-slate-100 flex justify-center items-center">
            <div className="bg-slate-50 p-2 w-full h-full rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-slate-300 transition-colors cursor-pointer">
                <Link to={`/profile/${user?.uid}`} onClick={onClose} className="flex items-center gap-3 overflow-hidden flex-1">
                    <Avatar src={user?.photoURL} name={user?.displayName} size="sm" />
                    <div className="truncate">
                        <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">View Profile</p>
                    </div>
                </Link>
                <button 
                    onClick={() => auth.signOut()} 
                    className="text-slate-400 hover:text-red-600 p-2.5 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow" 
                    title="Logout"
                >
                    <FaSignOutAlt />
                </button>
            </div>
        </div>
      </aside>
    </>
  );
};