import { useState, useEffect } from "react";
import { FaExclamationTriangle, FaArrowRight, FaTimes } from "react-icons/fa";

const OLD_DOMAIN = "likho-sooty.vercel.app";
const NEW_DOMAIN = "likho.co.in";

export default function DomainChangeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    // CRITICAL FIX: Don't show on localhost
    if ((hostname === OLD_DOMAIN) && !hostname.includes("localhost")) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"></div>
      <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
        <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
        <div className="p-8 flex flex-col items-center text-center">
          <div className="mb-6 p-4 bg-yellow-100 text-yellow-600 rounded-full animate-bounce-slow shadow-sm border-4 border-yellow-50">
            <FaExclamationTriangle size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">We've Moved!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Our platform has a brand new home. Please update your bookmarks.
          </p>
          <a
            href={`https://${NEW_DOMAIN}`}
            className="bg-slate-900 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 w-full"
          >
            Go to New Domain <FaArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}