import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaEllipsisH,
  FaTrash,
  FaLock,
  FaEdit,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { cn } from "../../utils/cn";
import { Modal } from "../../components/ui/Modal";

export const PostCard = ({ note, isDiary }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(note.likes?.includes(user?.uid));
  const [likesCount, setLikesCount] = useState(note.likes?.length || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Date handling
  const getDisplayDate = () => {
    if (note.timestamp?.seconds) {
      return new Date(note.timestamp.seconds * 1000).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric" }
      );
    }
    return "Just now";
  };

  const handleProfile = (e) => {
    e.stopPropagation();
    if (!isDiary && note.userId) navigate(`/profile/${note.userId}`);
  };

  const handleCardClick = () => {
    navigate(`/view/${isDiary ? "diary" : "posts"}/${note.id}`, {
      state: { note, isDiary },
    });
  };

  const toggleLike = async (e) => {
    e.stopPropagation();
    if (isDiary) return;
    if (!user) return toast.error("Login to like!");

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

    const postRef = doc(db, "posts", note.id);
    try {
      if (newIsLiked)
        await updateDoc(postRef, { likes: arrayUnion(user.uid) });
      else await updateDoc(postRef, { likes: arrayRemove(user.uid) });
    } catch (error) {
      setIsLiked(!newIsLiked);
      setLikesCount((prev) => (!newIsLiked ? prev + 1 : prev - 1));
    }
  };

  // open modal
  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  // confirm delete
  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, isDiary ? "diary" : "posts", note.id));
      toast.success("Deleted");
      setShowDeleteModal(false);
    } catch (err) {
      toast.error("Error deleting");
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate("/create", { state: { editData: note, isDiary } });
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={handleCardClick}
        className={cn(
          "rounded-3xl p-5 mb-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative break-inside-avoid",
          isDiary
            ? "bg-amber-50 border border-amber-100"
            : "bg-white border border-slate-100"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isDiary ? (
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                <FaLock size={12} />
              </div>
            ) : (
              <div
                onClick={handleProfile}
                className="cursor-pointer hover:opacity-80"
              >
                <Avatar
                  src={note.userPhoto || note.photoURL}
                  name={note.author}
                />
              </div>
            )}

            <div className="flex flex-col">
              <span
                onClick={handleProfile}
                className={cn(
                  "font-bold text-sm leading-tight",
                  isDiary
                    ? "text-amber-900"
                    : "text-slate-900 cursor-pointer hover:underline"
                )}
              >
                {isDiary ? "Dear Diary" : note.author}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                {getDisplayDate()}
              </span>
            </div>
          </div>

          {user?.uid === note.userId && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
              >
                <FaEllipsisH />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-0 top-8 bg-white shadow-xl border border-slate-100 rounded-xl py-2 w-32 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-3 text-slate-600 hover:bg-slate-50 w-full text-xs font-bold uppercase"
                    >
                      <FaEdit size={12} /> Edit
                    </button>

                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 w-full text-xs font-bold uppercase border-t border-slate-50"
                    >
                      <FaTrash size={12} /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          <p
            className={cn(
              "leading-relaxed whitespace-pre-wrap line-clamp-6 font-medium text-[15px]",
              isDiary
                ? "text-amber-900 font-serif"
                : "text-slate-600"
            )}
          >
            {note.content}
          </p>
        </div>

        {/* Actions */}
        {!isDiary && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-50/50">
            <div className="flex items-center gap-6">
              <button
                onClick={toggleLike}
                className={cn(
                  "flex items-center gap-2 text-sm font-bold transition-colors",
                  isLiked
                    ? "text-red-500"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {isLiked ? <FaHeart /> : <FaRegHeart />}
                <span>{likesCount}</span>
              </button>

              <button className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-600">
                <FaRegComment />
                <span>{note.commentCount || 0}</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Post?"
      >
        <p className="text-sm text-slate-600 mb-6">
          This action cannot be undone. Are you sure you want to permanently
          delete this?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </Modal>
    </>
  );
};
