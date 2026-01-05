import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { FaPenNib } from "react-icons/fa";
import { Avatar } from "../ui/Avatar";

export const Navbar = () => {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] || "Writer";

  return (
    <header className="w-full h-20 bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40 transition-all">
        <div className="h-full px-4 md:px-8 flex items-center justify-between mx-auto max-w-7xl">

            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Likho
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <Link 
                    to="/create" 
                    className="hidden md:flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                >
                    <FaPenNib /> Write
                </Link>

                <Link to={`/profile/${user?.uid}`} className="group">
                    <Avatar 
                        src={user?.photoURL} 
                        name={user?.displayName} 
                        size="md" 
                        className="border-2 border-white shadow-md group-hover:shadow-lg transition-all group-hover:border-primary-200"
                    />
                </Link>
            </div>
        </div>
    </header>
  );
};