import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FaPlus } from "react-icons/fa";

export const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="w-full h-16 sm:h-20 flex items-center px-4  sm:px-6 lg:px-8 justify-between z-30">
      
        <div className="w-8 md:hidden"></div> 
        
        {/* Welcome Text */}
        <div className="hidden md:block">
            <h2 className="font-bold text-lg  tracking-tight">
              Hi, <span className="text-slate-900 font-bold">{user?.displayName?.split(" ")[0]}</span> 👋
            </h2>
        </div>

        {/* Action Area */}
        <div className="flex items-center gap-5">
            <button 
                onClick={() => navigate('/create')}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white pl-4 pr-5 py-2.5 rounded-xl text-sm font-bold transition-all  active:scale-95 hover:-translate-y-0.5"
            >
                <div className="w-5 h-5 flex items-center justify-center">
                   <FaPlus size={10} />
                </div>
                <span>New</span>
            </button>
        </div>
    </header>
  );
};