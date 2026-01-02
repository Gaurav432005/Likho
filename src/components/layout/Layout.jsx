import { Outlet, useLocation } from "react-router-dom"; 
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Navbar } from "./Navbar";

export const Layout = () => {
   const location = useLocation();

   // Chat window logic to hide navbars inside a chat
   const isChatWindowOpen = location.pathname.startsWith("/chat/") && location.pathname.split("/").length > 2;

   return (
      <div className="flex h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-hidden">
         
         {/* Sidebar for Desktop */}
         <div className="hidden md:flex"><Sidebar /></div>
         
         {/* Main Content Area */}
         <div className="flex-1 flex flex-col h-full relative w-full">

            {/* Top Navbar (Hidden in deep chat) */}
            {!isChatWindowOpen && (
               <div className="sticky top-0 z-30 w-full"><Navbar /></div>
            )}
            
            {/* Scrollable Content */}
            <main className={`flex-1 overflow-y-auto scroll-smooth ${!isChatWindowOpen ? 'pb-20 md:pb-0' : ''}`}>
               <div className={`mx-auto w-full min-h-full ${!isChatWindowOpen ? 'px-4 py-6 md:px-8 md:py-6' : 'p-0 h-full'}`}>
                  <Outlet />
               </div>
            </main>

            {/* Bottom Nav for Mobile (Hidden in deep chat) */}
            {!isChatWindowOpen && (
               <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
                  <BottomNav />
               </div>
            )}
         </div>
      </div>
   );
};