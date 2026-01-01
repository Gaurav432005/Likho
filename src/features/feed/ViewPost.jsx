import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, onSnapshot, serverTimestamp, query, orderBy, deleteDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { FaArrowLeft, FaHeart, FaRegHeart, FaCopy, FaPaperPlane, FaTrash, FaGlobeAmericas, FaLock } from "react-icons/fa";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { toast } from "react-hot-toast";

export default function ViewPost() {
  const { collectionName, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [post, setPost] = useState(location.state?.note || null);
  const [loading, setLoading] = useState(!post);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentToDelete, setCommentToDelete] = useState(null);
  const textareaRef = useRef(null);

  const isDiary = collectionName === 'diary';

  // 1. Fetch Post Data
  useEffect(() => {
      const unsub = onSnapshot(doc(db, collectionName, id), (docSnap) => {
         if (docSnap.exists()) {
             setPost({ id: docSnap.id, ...docSnap.data() });
             setLoading(false);
         } else {
             toast.error("Post not found");
             navigate('/');
         }
      });
      return () => unsub();
  }, [id, collectionName]);

  // 2. Real-time Comments
  useEffect(() => {
    if (isDiary) return;
    const q = query(collection(db, collectionName, id, "comments"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
        setComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [id, collectionName]);

  // Auto-resize textarea
  useEffect(() => {
    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newComment]);

  const handleLike = async () => {
    if (!user || isDiary) return;
    const isLiked = post.likes?.includes(user.uid);
    const ref = doc(db, collectionName, id);
    
    // Optimistic
    setPost(prev => ({ ...prev, likes: isLiked ? prev.likes.filter(uid => uid !== user.uid) : [...(prev.likes || []), user.uid] }));
    
    await updateDoc(ref, { likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const submitComment = async (e) => {
      e.preventDefault();
      if(!newComment.trim()) return;
      
      const text = newComment;
      setNewComment(""); // Clear immediately
      
      try {
        await addDoc(collection(db, collectionName, id, "comments"), {
            text,
            userId: user.uid,
            author: user.displayName,
            photoURL: user.photoURL,
            timestamp: serverTimestamp()
        });
        
        await updateDoc(doc(db, collectionName, id), { commentCount: increment(1) });
        toast.success("Comment added");
      } catch (err) {
        toast.error("Failed to add comment");
        setNewComment(text); // Restore on fail
      }
  };

  const confirmDeleteComment = async () => {
      if(!commentToDelete) return;
      try {
        await deleteDoc(doc(db, collectionName, id, "comments", commentToDelete));
        await updateDoc(doc(db, collectionName, id), { commentCount: increment(-1) });
        setCommentToDelete(null);
        toast.success("Comment deleted");
      } catch (err) {
          toast.error("Failed to delete");
      }
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading...</div>;
  if (!post) return <div className="py-20 text-center">Post not found</div>;

  return (
    <div className="pb-24 mx-auto -mt-4 ">
        {/* Header */}
        <div className="flex items-center justify-between  bg-slate-50/90  backdrop-blur-sm pb-4 py-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 font-bold text-slate-500 hover:text-slate-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 transition-all">
                <FaArrowLeft /> Back
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 bg-slate-200/50 px-3 py-1 rounded-full border border-slate-200">
                {isDiary ? <><FaLock size={10}/> Private Diary</> : <><FaGlobeAmericas size={10}/> Public Post</>}
            </span>
        </div>
        
        {/* POST CONTENT */}
        <div className={`rounded-3xl shadow-sm border overflow-hidden mb-6 ${isDiary ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-200'}`}>
            <div className="p-6 md:p-8">
                {/* Author Info */}
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                    
                    {isDiary ? (
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200 shrink-0">
                            <FaLock size={20} />
                        </div>
                    ) : (
                        <div onClick={() => !isDiary && navigate(`/profile/${post.userId}`)} className="cursor-pointer">
                            <Avatar src={post.userPhoto || post.photoURL} name={post.author} size="md" />
                        </div>
                    )}

                    <div>
                        <h1 className="font-bold text-lg text-slate-900">{isDiary ? "Dear Diary" : post.author}</h1>
                        <p className="text-xs font-medium text-slate-400">
                            {post.timestamp?.seconds ? new Date(post.timestamp.seconds * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now'}
                        </p>
                    </div>
                </div>

                {/* Body */}
                <p className={`whitespace-pre-wrap leading-relaxed font-[500] text-base ${isDiary ? 'font-serif text-amber-900' : 'text-slate-800'}`}>
                    {post.content}
                </p>
            </div>

            {/* Actions Footer */}
            {!isDiary && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button onClick={handleLike} className={`flex items-center gap-2 font-bold text-sm transition-colors px-4 py-2 rounded-xl hover:bg-white ${post.likes?.includes(user?.uid) ? 'text-red-500' : 'text-slate-500'}`}>
                        {post.likes?.includes(user?.uid) ? <FaHeart className="text-lg"/> : <FaRegHeart className="text-lg"/>} 
                        <span>{post.likes?.length || 0} Likes</span>
                    </button>
                    <button onClick={() => {navigator.clipboard.writeText(post.content); toast.success("Copied");}} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
                        <FaCopy />
                    </button>
                </div>
            )}
        </div>

        {/* COMMENTS SECTION */}
        {!isDiary && (
            <div className="mt-8">
                <h3 className="font-bold text-slate-900 mb-4 text-lg">Comments ({comments.length})</h3>
                
                {/* Input Form */}
                <form onSubmit={submitComment} className="flex gap-3 mb-8 items-start relative">
             
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef} 
                            value={newComment} 
                            onChange={e => setNewComment(e.target.value)} 
                            placeholder="Write a comment..." 
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-14 py-4 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none min-h-[60px]"
                            rows={1}
                        />
                        <button type="submit" disabled={!newComment.trim()} className="absolute right-2 bottom-4 bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200">
                            <FaPaperPlane size={14} />
                        </button>
                    </div>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                    {comments.length === 0 && <p className="text-center text-slate-400 py-4 italic">No comments yet. Be the first!</p>}
                    
                    {comments.map(comment => {
                        const canDelete = user?.uid === comment.userId || user?.uid === post.userId;
                        return (
                            <div key={comment.id} className="flex gap-4 group animate-fade-in">
                                <div className="cursor-pointer shrink-0 mt-1" onClick={() => navigate(`/profile/${comment.userId}`)}>
                                    <Avatar src={comment.photoURL} name={comment.author} size="sm" />
                                </div>
                                <div className="flex-1">
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm relative group-hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-sm text-slate-900 cursor-pointer hover:underline" onClick={() => navigate(`/profile/${comment.userId}`)}>{comment.author}</span>
                                            <span className="text-[10px] text-slate-400 font-bold">
                                                {comment.timestamp?.seconds ? new Date(comment.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                                        
                                        {canDelete && (
                                            <button onClick={() => setCommentToDelete(comment.id)} className="absolute bottom-2 right-2 text-slate-300 hover:text-red-500 p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <FaTrash size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {/* Delete Modal */}
        <Modal isOpen={!!commentToDelete} onClose={() => setCommentToDelete(null)} title="Delete Comment">
            <p className="text-slate-600 mb-6">Are you sure you want to delete this comment?</p>
            <div className="flex gap-3">
                <button onClick={() => setCommentToDelete(null)} className="flex-1 py-3 border border-slate-200 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={confirmDeleteComment} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100">Delete</button>
            </div>
        </Modal>
    </div>
  );
}