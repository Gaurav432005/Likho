import { useState, useEffect } from "react";
import { FaExclamationTriangle, FaArrowRight } from "react-icons/fa";

const OLD_DOMAIN = "likho-sooty.vercel.app";
const NEW_DOMAIN = "www.likho.co.in";

export default function DomainChangeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;

    // Logic: Agar user purane domain par hai tabhi dikhao. 
    // localhost par test karne ke liye '&& !hostname.includes("localhost")' ko hata sakte ho.
    if (hostname === OLD_DOMAIN && !hostname.includes("localhost")) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"></div>
      
      {/* Banner Card */}
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Decorative Top Gradient */}
        <div className="h-3 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600"></div>
        
        <div className="p-8 pt-10 flex flex-col items-center text-center">
          {/* Warning Icon Container */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-orange-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative p-5 bg-orange-50 text-orange-500 rounded-full border-2 border-orange-100">
              <FaExclamationTriangle size={36} />
            </div>
          </div>

          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">We Have Moved!</h2>
          <p className="text-slate-500 mb-8 font-medium">
            Our website has officially shifted to a new address.
          </p>

          {/* Visual Domain Comparison */}
          <div className="w-full bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100">
            <div className="flex flex-col items-center gap-3">
              <div className="text-slate-400 text-sm font-mono line-through opacity-70">
                {OLD_DOMAIN}
              </div>
              
              <div className="bg-white p-2 rounded-full shadow-sm border border-slate-100 text-slate-300">
                <FaArrowRight className="rotate-90 sm:rotate-90" size={12} />
              </div>
              
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Live Now</span>
                <div className="text-xl font-bold text-slate-800 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 font-mono">
                  {NEW_DOMAIN}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <a
            href={`https://${NEW_DOMAIN}`}
            className="group w-full bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl hover:bg-black transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
          >
            Visit New Site
            <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
          </a>
          
          <p className="mt-6 text-xs text-slate-400 font-medium italic">
            Please update your bookmarks for faster access.
          </p>
        </div>
      </div>
    </div>
  );
}
