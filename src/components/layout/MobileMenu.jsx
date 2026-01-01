import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../lib/firebase";
import { FaTimes, FaHome, FaBook, FaPenNib, FaEnvelope, FaUser, FaSignOutAlt, FaChevronRight } from "react-icons/fa";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "../ui/Avatar";

export const MobileMenu = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const links = [
    { path: "/", name: "Home ", icon: <FaHome size={20} /> },
    { path: "/diary", name: "My Diary", icon: <FaBook size={18} /> },
    { path: "/create", name: "Write New", icon: <FaPenNib size={18} /> },
    { path: "/chat", name: "Messages", icon: <FaEnvelope size={18} /> },
  ];

  const handleLogout = () => {
      auth.signOut();
      onClose();
      navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end md:hidden">
 
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-[85%] max-w-sm h-full bg-white shadow-2xl flex flex-col  overflow-hidden"
        >
            <div className="p-6 pt-10 bg-slate-50 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3" onClick={() => navigate(`/profile/${user?.uid}`)}>
                        <div className="border-2 border-white shadow-md flex  rounded-full">
                            <Avatar src={user?.photoURL} name={user?.displayName} size="lg" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-lg leading-tight truncate max-w-[150px]">
                                {user?.displayName || "User"}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">View Profile</p>
                        </div>
                    </div>
                    
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100">
                        <FaTimes size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 py-6 space-y-2">
              
                
                {links.map((link) => {
                    const active = isActive(link.path);
                    return (
                        <Link 
                            key={link.path} 
                            to={link.path}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-200 group ${
                                active 
                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`${active ? "text-indigo-300" : "text-slate-400 group-hover:text-indigo-600"}`}>
                                    {link.icon}
                                </span>
                                <span className="font-bold text-sm">{link.name}</span>
                            </div>
                            {active && <FaChevronRight size={12} className="opacity-50" />}
                        </Link>
                    )
                })}

                <Link 
                    to={`/profile/${user?.uid}`}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 ${isActive(`/profile/${user?.uid}`) ? "bg-slate-100 text-slate-900 font-bold" : ""}`}
                >
                    <span className="text-slate-400"><FaUser size={18}/></span>
                    <span className="font-bold text-sm">My Profile</span>
                </Link>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/30 pb-safe">
                <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 active:scale-95 transition-all"
                >
                    <FaSignOutAlt /> Log Out
                </button>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};