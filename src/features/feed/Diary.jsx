import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, orderBy, getDocs, limit, startAfter, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import Masonry from "react-masonry-css"; 
import { PostCard } from "./PostCard";
import { Button } from "../../components/ui/Button";
import { Loading } from "../../components/ui/Loading";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { useNavigate } from "react-router-dom";
import { FaArrowDown, FaLock, FaPenNib } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function Diary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchEntries();
  }, [user?.uid]); 

  const fetchEntries = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, "diary"), 
        where("userId", "==", user.uid), 
        orderBy("timestamp", "desc"), 
        limit(20)
      );
      const snapshot = await getDocs(q);
      
      setEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 20);
    } catch (e) { 
      console.error("Fetch diary error:", e);
      setError("Failed to load diary entries");
      toast.error("Failed to load diary");
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreEntries = async () => {
    if (!lastDoc || !hasMore || loadingMore || !user?.uid) return;
    try {
      setLoadingMore(true);
      const q = query(
        collection(db, "diary"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        startAfter(lastDoc),
        limit(20)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const newEntries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setEntries(prev => [...prev, ...newEntries]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error("Fetch more diary error:", e);
      toast.error("Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleEntryDelete = async (entryId) => {
    const deleted = entries.find(e => e.id === entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));

    try {
      await deleteDoc(doc(db, "diary", entryId));
      toast.success("Entry deleted");
    } catch (e) {
      console.error("Delete error:", e);
      toast.error("Failed to delete");
      if (deleted) {
        setEntries(prev => [...prev, deleted]);
      }
    }
  };

  if (loading) return <Loading message="Loading diary..." />;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary-100 p-3 rounded-lg">
          <FaLock className="text-primary-600 text-xl" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Diary</h2>
          <p className="text-slate-500 text-sm">Only you can see these entries</p>
        </div>
      </div>

      {error && (
        <ErrorState title="Diary Error" message={error} onRetry={fetchEntries} />
      )}

      {entries.length === 0 ? (
        <EmptyState 
          icon={FaPenNib}
          title="Your diary is empty"
          description="Start writing your private thoughts..."
          actionLabel="Write Entry"
          onAction={() => navigate('/create', { state: { mode: 'diary' } })}
        />
      ) : (
        <>
          <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="flex w-auto -ml-4" columnClassName="pl-4">
            {entries.map(entry => (
              entry.id && (
                <PostCard 
                  key={entry.id} 
                  note={entry} 
                  onDelete={() => handleEntryDelete(entry.id)} 
                />
              )
            ))}
          </Masonry>
          
          {hasMore && (
            <div className="flex justify-center mt-8 pb-8">
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
