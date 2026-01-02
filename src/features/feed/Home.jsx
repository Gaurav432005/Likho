import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, limit, getDocs, startAfter, deleteDoc, doc } from "firebase/firestore";
import Masonry from "react-masonry-css"; 
import { PostCard } from "./PostCard";
import { Button } from "../../components/ui/Button";
import { Loading } from "../../components/ui/Loading";
import { useNavigate } from "react-router-dom";
import { FaPenFancy, FaArrowDown } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
        const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20));
        const snapshot = await getDocs(q);
        const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(newPosts);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 20);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchMorePosts = async () => {
      if (!lastDoc) return;
      setLoadingMore(true);
      try {
          const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), startAfter(lastDoc), limit(20));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
              const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              setPosts(prev => [...prev, ...newPosts]);
              setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
          } else { setHasMore(false); }
      } catch (error) { console.error(error); } 
      finally { setLoadingMore(false); }
  };

  // Optimistic Delete Handler
  const handlePostDelete = async (postId) => {
      // 1. Instantly remove from UI
      setPosts(prev => prev.filter(p => p.id !== postId));
      
      try {
         // 2. Delete from DB
         await deleteDoc(doc(db, "posts", postId));
         toast.success("Deleted");
      } catch (error) {
         toast.error("Failed to delete");
         // Optional: Re-fetch or add back if failed, but for MVP keep it simple
      }
  };

  return (
    <div className="min-h-full pb-24">
       {loading ? <Loading message="Loading Feed..." /> : posts.length === 0 ? (
         <div className="text-center py-24 bg-white mx-2 rounded-3xl border border-dashed border-slate-200">
            <h3 className="font-bold text-lg mb-2 text-slate-800">It's quiet here</h3>
            <Button onClick={() => navigate('/create')} className="gap-2"><FaPenFancy /> Create Post</Button>
         </div>
       ) : (
         <>
             <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
               {/* Pass handleDelete to allow optimistic update from Child */}
               {posts.map(post => <PostCard key={post.id} note={post} onDelete={() => handlePostDelete(post.id)} />)}
             </Masonry>
             
             {hasMore && (
                 <div className="flex justify-center mt-8">
                     <Button onClick={fetchMorePosts} disabled={loadingMore} variant="secondary">
                        {loadingMore ? "Loading..." : <><FaArrowDown className="mr-2"/> Load More</>}
                     </Button>
                 </div>
             )}
         </>
       )}
    </div>
  );
}