import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { FaBars } from "react-icons/fa";

export const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-full relative transition-all duration-300">
        
        <div className="flex-none z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
           <div className="md:hidden absolute left-4 top-4 z-50">
               <button 
                 onClick={() => setIsSidebarOpen(true)} 
                 className="text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors"
               >
                   <FaBars size={20} />
               </button>
           </div>
           <Navbar />
        </div>

        <main className="flex-1 w-screen md:w-auto lg:w-auto overflow-y-auto scroll-smooth p-4 md:p-6 lg:p-8">
           <div className=" mx-auto h-full animate-fade-in">
              <Outlet />
           </div>
        </main>

      </div>
    </div>
  );
};