import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { FaLock, FaEllipsisH, FaEdit, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom"; 

export const PostCard = ({ note, onEdit, onDelete, isDiary = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false); // Sirf mobile menu ke liye state

  const isOwner = user && note.userId === user.uid;

  const authorName = isDiary ? "Dear Diary" : (isOwner ? (user.displayName || "Anonymous") : (note.author || "Anonymous"));
  const authorPhoto = isDiary ? null : (isOwner ? (user.photoURL || null) : (note.photoURL || null));

  // Date aur Time formatters
  const dateObj = note.timestamp?.seconds ? new Date(note.timestamp.seconds * 1000) : new Date();
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = dateObj.toLocaleTimeString("en-US", { hour: '2-digit', minute:'2-digit' });

  const MAX_LENGTH = 200;
  const isLong = note.content.length > MAX_LENGTH;
  const previewText = isLong ? note.content.substr(0, MAX_LENGTH).substr(0, note.content.substr(0, MAX_LENGTH).lastIndexOf(" ")) + "..." : note.content;

  const handleCardClick = () => {
    navigate(`/view/${isDiary ? 'diary' : 'posts'}/${note.id}`, { state: { note, isDiary } });
  };

  return (
    <motion.div
      layout
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group mb-4 break-inside-avoid rounded-2xl shadow p-6 cursor-pointer flex flex-col relative overflow-visible transition-all duration-300
                  ${isDiary 
                    ? 'bg-[#FFFBF2] border border-[#F4EBD0] hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)]' 
                    : 'bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)]'
                  }`}
    >

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3.5">
          {/* Avatar / Icon Logic */}
          {isDiary ? (
            <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm border border-amber-50">
                <FaLock size={14} />
            </div>
          ) : (
            authorPhoto ? (
                <img src={authorPhoto} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-md" alt="Author" />
            ) : (
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border-2 border-white shadow-sm">
                  {authorName[0]?.toUpperCase()}
                </div>
            )
          )}

          <div className="flex flex-col"> 
            <span className={`text-[15px] font-bold leading-none mb-1 ${isDiary ? 'text-amber-900' : 'text-slate-900'}`}> 
                {authorName} 
            </span> 
            <div className="flex items-center gap-1.5 opacity-60">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {dateStr} 
                </span>
            </div>
          </div>
        </div>

        {/* MOBILE ONLY: 3-Dots Menu (md:hidden) */}
        {isOwner && (
          <div className="md:hidden relative">
             <button 
                onClick={(e) => { e.stopPropagation(); setShowMobileMenu(!showMobileMenu); }}
                className="p-2 -mr-2 text-slate-400 active:bg-slate-50 rounded-full"
             >
               <FaEllipsisH />
             </button>
             
             {/* Mobile Dropdown */}
             <AnimatePresence>
                {showMobileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-full mt-1 z-20 w-32 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(note); setShowMobileMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-600 active:bg-slate-50 flex items-center gap-2"
                    >
                        <FaEdit size={12} /> Edit
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); setShowMobileMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 active:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                    >
                        <FaTrash size={12} /> Delete
                    </button>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        )}
      </div>

      <div className={`relative text-[15px] leading-relaxed ${isDiary ? 'text-amber-900/90 font-serif ' : 'text-slate-600 font-medium'}`}>
        <p className="whitespace-pre-wrap break-words">{previewText}</p>
        
        {isLong && (
          <span className={`mt-3 text-xs font-bold  tracking-wider block transition-all duration-300
            ${isDiary ? 'text-amber-600' : 'text-black'}
            
            opacity-100 translate-y-0

            md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0
          `}>
            Read more 
          </span>
        )}
      </div>

      {isOwner && (
        <div className="hidden md:flex absolute top-4 right-4 gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
           <button 
             onClick={(e) => { e.stopPropagation(); onEdit(note); }}
             className="p-2 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-indigo-600 hover:bg-white shadow-sm border border-slate-100"
           >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
             className="p-2 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-red-600 hover:bg-white shadow-sm border border-slate-100"
           >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
           </button>
        </div>
      )}
    </motion.div>
  );
};
