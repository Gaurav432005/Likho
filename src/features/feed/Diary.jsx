import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, orderBy, getDocs, limit, startAfter, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import Masonry from "react-masonry-css"; 
import { PostCard } from "./PostCard";
import { Button } from "../../components/ui/Button";
import { Loading } from "../../components/ui/Loading";
import { useNavigate } from "react-router-dom";
import { FaArrowDown, FaLock } from "react-icons/fa"; // Icon added
import { toast } from "react-hot-toast";

export default function Diary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // FIX: Check user?.uid instead of full user object
    if(user?.uid) fetchEntries();
  }, [user?.uid]); 

  const fetchEntries = async () => {
    setLoading(true);
    try {
        const q = query(
            collection(db, "diary"), 
            where("userId", "==", user.uid), 
            orderBy("timestamp", "desc"), 
            limit(20)
        );
        const snapshot = await getDocs(q);
        setEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 20);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const fetchMoreEntries = async () => {
      if (!lastDoc) return;
      setLoadingMore(true);
      try {
          const q = query(
              collection(db, "diary"), 
              where("userId", "==", user.uid), 
              orderBy("timestamp", "desc"), 
              startAfter(lastDoc), 
              limit(20)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
              setEntries(prev => [...prev, ...snapshot.docs.map(d => ({ id: d.id, ...d.data() }))]);
              setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
          } else { setHasMore(false); }
      } catch (e) { console.error(e); } 
      finally { setLoadingMore(false); }
  };

  const handleDiaryDelete = async (id) => {
      // Optimistic UI Update
      setEntries(prev => prev.filter(e => e.id !== id));
      try { 
          await deleteDoc(doc(db, "diary", id)); 
          toast.success("Entry deleted"); 
      } catch(e) { 
          toast.error("Could not delete");
          // Optional: Re-fetch entries if fail
      }
  };

  if (loading) return <Loading message="Opening Diary..." />;

  return (
    <div className="pb-20 min-h-full">
       {entries.length === 0 ? (
         <div className="text-center flex flex-col justify-center items-center py-24 bg-amber-50/50 rounded-3xl border border-dashed border-amber-200 mx-2 mt-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
                <FaLock size={24} />
            </div>
            <h3 className="font-bold text-amber-900 mb-2 text-lg">Your Secret Diary</h3>
            <p className="text-amber-700/60 text-sm mb-6 max-w-xs">Write your personal thoughts here. Only you can see them.</p>
            <Button variant="secondary" onClick={() => navigate('/create', { state: { mode: 'diary' } })}>Write First Entry</Button>
         </div>
       ) : (
         <>
            <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
                {entries.map(entry => (
                    <PostCard 
                        key={entry.id} 
                        note={entry} 
                        isDiary={true} 
                        onDelete={() => handleDiaryDelete(entry.id)} 
                    />
                ))}
            </Masonry>
            
            {hasMore && (
                 <div className="flex justify-center mt-8">
                     <Button onClick={fetchMoreEntries} disabled={loadingMore} variant="secondary">
                        {loadingMore ? "Loading..." : <><FaArrowDown className="mr-2"/> Load More</>}
                     </Button>
                 </div>
             )}
         </>
       )}
    </div>
  );
}