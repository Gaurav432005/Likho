import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom"; 
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Navbar } from "./Navbar";
import { MobileMenu } from "./MobileMenu";

export const Layout = () => {
   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
   const location = useLocation();

   const isChatWindowOpen = location.pathname.startsWith("/chat/") && location.pathname.split("/").length > 2;

   return (
      <div className="flex h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-hidden">
         
         <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

         <div className="hidden md:flex"><Sidebar /></div>
         
         <div className="flex-1 flex flex-col h-full relative w-full">

            {!isChatWindowOpen && (
               <div className="sticky top-0 z-30 w-full"><Navbar /></div>
            )}
            
            <main className={`flex-1 overflow-y-auto scroll-smooth ${!isChatWindowOpen ? 'pb-20 md:pb-0' : ''}`}>
               <div className={`mx-auto w-full min-h-full ${!isChatWindowOpen ? 'px-4 py-6 md:px-8 md:py-6' : 'p-0 h-full'}`}>
                  <Outlet />
               </div>
            </main>

            {!isChatWindowOpen && (
               <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                  <BottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
               </div>
            )}
         </div>
      </div>
   );
};