import { useState, useEffect } from "react";
import { FaDownload, FaTimes } from "react-icons/fa";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user dismissed it recently (7 days cooldown)
    const dismissedTime = localStorage.getItem("install_dismissed");
    if (dismissedTime) {
       const daysPassed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
       if (daysPassed < 7) return; // Don't show if dismissed less than 7 days ago
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
      setIsVisible(false);
      localStorage.setItem("install_dismissed", Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-fade-in md:w-96 md:left-auto">
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
             <FaDownload className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Install Likho App</h3>
            <p className="text-xs text-slate-400">Add to Home Screen</p>
          </div>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={handleDismiss}
                className="p-2 text-slate-400 hover:text-white transition"
            >
                <FaTimes />
            </button>
            <button 
                onClick={handleInstallClick}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-900/50"
            >
                Install
            </button>
        </div>
      </div>
    </div>
  );
}