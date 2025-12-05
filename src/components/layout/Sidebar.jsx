import { Link, useLocation } from "react-router-dom";
import { FaHome, FaPenNib, FaCog, FaFeatherAlt, FaBook } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation(); // Get current route

  // Manual Active Check Logic
  const isActive = (path) => {

    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/view/posts");
    }
    // 2. Diary Active logic (Includes viewing diary entries)
    if (path === "/diary") {
      return location.pathname === "/diary" || location.pathname.startsWith("/view/diary");
    }
    // 3. Default logic for others
    return location.pathname === path;
  };

  const navItems = [
    { path: "/", name: "Home", icon: <FaHome size={18} /> },
    { path: "/diary", name: "My Diary", icon: <FaBook size={18} /> },
    { path: "/create", name: "Write", icon: <FaPenNib size={18} /> },
    { path: "/settings", name: "Settings", icon: <FaCog size={18} /> },
  ];

  const overlayClass = isOpen ? "fixed inset-0 bg-black/40 z-40 md:hidden block backdrop-blur-sm transition-opacity" : "hidden";
  const sidebarClass = `
    fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 
    transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
    ${isOpen ? "translate-x-0" : "-translate-x-full"} 
    md:translate-x-0 md:static md:flex flex-col
  `;

  return (
    <>
      <div className={overlayClass} onClick={onClose}></div>
      
      <aside className={sidebarClass}>
        {/* Brand */}
        <div className="h-20 flex items-center gap-3 px-8 border-b border-slate-50">
           <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
              <FaFeatherAlt className="text-lg" />
           </div>
           <span className="text-xl font-bold text-slate-800 tracking-tight">Likho</span>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium text-sm
                  ${active 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 translate-x-1" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1"
                  }
                `}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Mini Profile */}
        <div className="p-4 border-t border-slate-100">
          <Link 
            to="/settings"
            onClick={onClose}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${isActive('/settings') ? 'bg-slate-50 border-slate-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
          >
             {user?.photoURL ? (
                <img src={user.photoURL} className="w-10 h-10 rounded-full object-cover border border-white shadow-sm" alt="User" />
             ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    {user?.displayName?.[0] || "U"}
                </div>
             )}
             <div className="overflow-hidden">
               <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                  {user?.displayName || "Writer"}
               </p>
               <p className="text-[10px] text-slate-400 font-medium">View Profile</p>
             </div>
          </Link>
        </div>
      </aside>
    </>
  );
};