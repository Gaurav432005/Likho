import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import Masonry from "react-masonry-css"; 
import { PostCard } from "./PostCard";
import { Button } from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { FaHome, FaPenFancy } from "react-icons/fa";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // FIX: Switched to onSnapshot for Real-Time updates
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    }, (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const breakpointColumns = { default: 3, 1100: 2, 700: 1 };

  return (
    <div className="min-h-full pb-24">


       {loading ? (
         <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
             <p className="text-slate-400 font-medium text-sm">Loading...</p>
         </div>
       ) : posts.length === 0 ? (
         <div className="text-center py-24 bg-white mx-2 rounded-3xl border border-dashed border-slate-200">
            <h3 className="font-bold text-lg mb-2 text-slate-800">It's quiet here</h3>
            <p className="text-slate-500 mb-6 text-sm">Be the first to share your thoughts.</p>
            <Button onClick={() => navigate('/create')} className="gap-2"><FaPenFancy /> Create Post</Button>
         </div>
       ) : (
         <Masonry breakpointCols={breakpointColumns} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
           {posts.map(post => <PostCard key={post.id} note={post} />)}
         </Masonry>
       )}
    </div>
  );
}