import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Masonry from "react-masonry-css"; 
import { PostCard } from "../components/feed/PostCard";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { FaLock } from "react-icons/fa";

export default function Diary() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    if (!user) return;

    // PRIVATE DIARY QUERY
    // Only fetch where userId == current user
    const q = query(
        collection(db, "diary"), 
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    const toastId = toast.loading("Tearing page...");
    try {
      await deleteDoc(doc(db, "diary", deleteModal.id));
      toast.success("Page torn", { id: toastId });
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
   

      {entries.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-amber-200 rounded-3xl bg-amber-50/50 mt-2"
        >
           <h3 className="text-2xl font-bold text-slate-800 mb-2">Dear Diary...</h3>
           <p className="text-slate-500 mb-6">Write something just for yourself.</p>
           <Button variant="active" onClick={() => navigate('/create', { state: { mode: 'diary' } })}>Write Entry</Button>
        </motion.div>
      ) : (
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex w-auto -ml-6"
          columnClassName="pl-6 bg-clip-padding"
        >
          {entries.map((entry) => (
            <PostCard 
              key={entry.id} 
              note={entry} 
              isDiary={true}
              onEdit={(n) => navigate('/create', { state: { editData: n, mode: 'diary' } })} 
              onDelete={(id) => setDeleteModal({ isOpen: true, id })} 
            />
          ))}
        </Masonry>
      )}

      <Modal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ isOpen: false, id: null })} 
        title="Tear Page?"
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-slate-600 mb-6">This memory will be lost forever.</p>
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal({ isOpen: false, id: null })}>Keep</Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Tear It</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}