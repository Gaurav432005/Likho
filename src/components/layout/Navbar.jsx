import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { FaPenNib } from "react-icons/fa";
import { Avatar } from "../ui/Avatar";

export const Navbar = () => {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] || "Writer";

  return (
    <header className="w-full h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 transition-all">
        <div className="h-full px-4 md:px-8 flex items-center justify-between mx-auto max-w-7xl">

            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Hi, <span className="text-slate-900">{firstName}</span> 👋
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <Link 
                    to="/create" 
                    className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                >
                    <FaPenNib /> Write
                </Link>

                <Link to={`/profile/${user?.uid}`} className="relative group cursor-pointer block">
                    <Avatar 
                        src={user?.photoURL} 
                        name={user?.displayName} 
                        size="md" 
                        className="border-2 border-white shadow-sm group-hover:border-indigo-100 transition-all"
                    />
                </Link>
            </div>
        </div>
    </header>
  );
};