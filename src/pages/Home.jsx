import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Masonry from "react-masonry-css"; 
import { PostCard } from "../components/feed/PostCard";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { FaGlobeAmericas } from "react-icons/fa";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
   
    const q = query(
        collection(db, "posts"), 
        orderBy("timestamp", "desc"),
        limit(50) 
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    const toastId = toast.loading("Deleting...");
    try {
      await deleteDoc(doc(db, "posts", deleteModal.id));
      toast.success("Deleted", { id: toastId });
      setDeleteModal({ isOpen: false, id: null });
    } catch (error) {
      toast.error("Failed to delete", { id: toastId });
    }
  };

  const breakpointColumns = { default: 3, 1100: 2, 700: 1 };

  if (loading) return (
     <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
     </div>
  );

  return (
    <div className="min-h-full">
  

      {posts.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50 mt-2"
        >
           <h3 className="text-2xl font-bold text-slate-800 mb-2">It's quiet here...</h3>
           <Button onClick={() => navigate('/create')}>Write First Post</Button>
        </motion.div>
      ) : (
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex w-auto -ml-6"
          columnClassName="pl-6 bg-clip-padding"
        >
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              note={post} 
              onEdit={(n) => navigate('/create', { state: { editData: n, mode: 'public' } })} 
              onDelete={(id) => setDeleteModal({ isOpen: true, id })} 
            />
          ))}
        </Masonry>
      )}

      <Modal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ isOpen: false, id: null })} 
        title="Delete Post"
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-slate-600 mb-6">Are you sure you want to delete this post?</p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal({ isOpen: false, id: null })}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}