import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, limit, getDocs, startAfter, deleteDoc, doc } from "firebase/firestore";
import Masonry from "react-masonry-css"; 
import { PostCard } from "./PostCard";
import { Button } from "../../components/ui/Button";
import { Loading } from "../../components/ui/Loading";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { useNavigate } from "react-router-dom";
import { FaPenFancy, FaArrowDown, FaFire } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { 
    fetchPosts(); 
    fetchTrendingPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), limit(20));
      const snapshot = await getDocs(q);
      
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(newPosts);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      setHasMore(snapshot.docs.length === 20);
    } catch (error) { 
      console.error("Fetch posts error:", error);
      setError("Failed to load posts");
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingPosts = async () => {
    try {
      const q = query(
        collection(db, "posts"),
        orderBy("timestamp", "desc"),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const trending = allPosts
        .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
        .slice(0, 12);
      setTrendingPosts(trending);
    } catch (error) {
      console.error("Fetch trending error:", error);
    }
  };

  const fetchMorePosts = async () => {
    if (!lastDoc || !hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      const q = query(collection(db, "posts"), orderBy("timestamp", "desc"), startAfter(lastDoc), limit(20));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(prev => [...prev, ...newPosts]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 20);
      } else { 
        setHasMore(false); 
      }
    } catch (error) { 
      console.error("Fetch more posts error:", error);
      toast.error("Failed to load more posts");
    } finally {
      setLoadingMore(false); 
    }
  };

  const handlePostDelete = async (postId) => {
    const deletedPost = posts.find(p => p.id === postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    
    try {
      await deleteDoc(doc(db, "posts", postId));
      setTrendingPosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Post deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete");
      if (deletedPost) {
        setPosts(prev => [...prev, deletedPost]);
      }
    }
  };

  if (loading) return <Loading message="Loading feed..." />;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {error && (
        <ErrorState title="Feed Error" message={error} onRetry={fetchPosts} />
      )}

      {/* Trending Toggle */}
      {trendingPosts.length > 0 && (
        <div className="flex gap-3 mb-8 sticky top-0  z-20 bg-white/95 backdrop-blur py-4 md:-mx-10 -mx-4 -my-6 px-4 border-b border-slate-200">
          <button
            onClick={() => setShowTrending(false)}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
              !showTrending
                ? "bg-slate-900 text-white shadow-lg"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setShowTrending(true)}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
              showTrending
                ? "bg-primary-600 text-white shadow-lg"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <FaFire /> Trending
          </button>
        </div>
      )}

      {/* Posts Grid */}
      {showTrending && trendingPosts.length > 0 ? (
        <>
          <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="flex w-auto -ml-4" columnClassName="pl-4">
            {trendingPosts.map(post => (
              post.id && (
                <PostCard 
                  key={post.id} 
                  note={post} 
                  onDelete={() => handlePostDelete(post.id)} 
                />
              )
            ))}
          </Masonry>
        </>
      ) : showTrending ? (
        <EmptyState 
          icon={FaFire}
          title="No trending posts"
          description="Check back later for popular content!"
        />
      ) : posts.length === 0 ? (
        <EmptyState 
          icon={FaPenFancy}
          title="Your feed is empty"
          description="Be the first to share your thoughts!"
          actionLabel="Create Post"
          onAction={() => navigate('/create')}
        />
      ) : (
        <>
          <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="flex w-auto -ml-4" columnClassName="pl-4">
            {posts.map(post => (
              post.id && (
                <PostCard 
                  key={post.id} 
                  note={post} 
                  onDelete={() => handlePostDelete(post.id)} 
                />
              )
            ))}
          </Masonry>
          
          {hasMore && (
            <div className="flex justify-center mt-8 pb-8">
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
