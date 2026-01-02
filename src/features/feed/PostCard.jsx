import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaRegHeart, FaEllipsisH, FaTrash, FaLock, FaEdit } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { cn } from "../../utils/cn";
import { Modal } from "../../components/ui/Modal";

export const PostCard = ({ note, isDiary, onDelete }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isLiked, setIsLiked] = useState(note.likes?.includes(user?.uid));
  const [likesCount, setLikesCount] = useState(note.likes?.length || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false); // Local delete state

  const handleProfile = (e) => {
    e.stopPropagation();
    if (!isDiary && note.userId) navigate(`/profile/${note.userId}`);
  };

  const handleCardClick = () => {
      navigate(`/view/${isDiary ? 'diary' : 'posts'}/${note.id}`, { state: { note, isDiary } });
  };

  const toggleLike = async (e) => {
    e.stopPropagation();
    if (isDiary) return; 
    if (!user) return toast.error("Login to like!");

    // Optimistic Update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

    const postRef = doc(db, "posts", note.id);
    try {
      if (newIsLiked) await updateDoc(postRef, { likes: arrayUnion(user.uid) });
      else await updateDoc(postRef, { likes: arrayRemove(user.uid) });
    } catch (error) {
      // Revert if failed
      setIsLiked(!newIsLiked);
      setLikesCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    // 1. If Parent provided delete logic, use it (Fastest)
    if (onDelete) {
        onDelete(); 
        setShowDeleteModal(false);
        return;
    }

    // 2. Fallback: Self-delete logic (e.g. Profile Page)
    try {
        await deleteDoc(doc(db, isDiary ? "diary" : "posts", note.id));
        toast.success("Deleted successfully");
        setIsDeleted(true); // Hide card visually
    } catch(err) { 
        toast.error("Error deleting"); 
    } finally {
        setShowDeleteModal(false);
    }
  };

  const handleEdit = (e) => {
      e.stopPropagation();
      navigate('/create', { state: { editData: note, isDiary } });
  };

  if (isDeleted) return null; // Component unmounts effectively

  return (
    <>
      <motion.div 
        layout
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={handleCardClick}
        className={cn(
          "group rounded-3xl p-5 mb-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative break-inside-avoid",
          isDiary ? "bg-amber-50 border border-amber-100" : "bg-white border border-slate-100"
        )}
      >
        <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-3">
              {isDiary ? (
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200"><FaLock size={14}/></div>
              ) : (
                  <div onClick={handleProfile} className="cursor-pointer hover:opacity-80 transition-opacity">
                      <Avatar src={note.photoURL} name={note.author} />
                  </div>
              )}
              
              <div className="flex flex-col">
                  <span onClick={handleProfile} className={cn("font-bold text-sm leading-tight", isDiary ? "text-amber-900" : "text-slate-900 cursor-pointer hover:underline")}>
                    {isDiary ? "Dear Diary" : note.author}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
                    {note.timestamp?.seconds ? new Date(note.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                  </span>
              </div>
           </div>
           
           {user?.uid === note.userId && (
               <div className="relative">
                   <button 
                      onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} 
                      className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                   >
                      <FaEllipsisH />
                   </button>
                   <AnimatePresence>
                      {showMenu && (
                          <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute right-0 top-8 bg-white shadow-xl border border-slate-100 rounded-xl py-2 w-32 z-10 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                          >
                              <button onClick={handleEdit} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 w-full text-sm font-bold"><FaEdit size={12}/> Edit</button>
                              <button onClick={handleDeleteClick} className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 w-full text-sm font-bold border-t border-slate-50"><FaTrash size={12}/> Delete</button>
                          </motion.div>
                      )}
                   </AnimatePresence>
               </div>
           )}
        </div>

        <div className="mb-4">
           <p className={cn("leading-relaxed whitespace-pre-wrap line-clamp-6 font-medium text-[15px]", isDiary ? "text-amber-900 font-serif" : "text-slate-600")}>
               {note.content}
           </p>
        </div>

      </motion.div>

      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title={isDiary ? "Delete Entry?" : "Delete Post?"}
      >
         <div className="space-y-4">
            <p className="text-slate-600 font-medium">
               Are you sure you want to delete this? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end pt-2">
               <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
               >
                  Cancel
               </button>
               <button 
                  onClick={confirmDelete} 
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
               >
                  Yes, Delete
               </button>
            </div>
         </div>
      </Modal>
    </>
  );
};