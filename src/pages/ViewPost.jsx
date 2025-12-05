import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { FaArrowLeft, FaGlobeAmericas, FaLock, FaCalendarAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export default function ViewPost() {
  const { collectionName, id } = useParams(); // URL params: /view/posts/123
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Try to get data from navigation state first (Instant Load), otherwise null
  const [post, setPost] = useState(location.state?.note || null);
  const [loading, setLoading] = useState(!post);
  
  const isDiary = collectionName === 'diary';

  // Fetch from DB if user landed here via direct link
  useEffect(() => {
    if (!post) {
      const fetchPost = async () => {
        try {
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setPost({ id: docSnap.id, ...docSnap.data() });
          } else {
            // console.log("No such document!");
          }
        } catch (err) {
            console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchPost();
    }
  }, [id, collectionName, post]);

  if (loading) return (
     <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
     </div>
  );

  if (!post) return (
    <div className="flex flex-col h-full items-center justify-center text-slate-400">
        <h2 className="text-xl font-bold mb-2">Post not found</h2>
        <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">Go Home</button>
    </div>
  );

  // Author Logic (Same as Card)
  const isOwner = user && post.userId === user.uid;


  return (
    <div className="w-full pb-10  mx-auto animate-fade-in  flex flex-col">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-4 ">
            <button onClick={() => navigate(-1)} className="text-sm flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <FaArrowLeft /> Back
            </button>
            <div className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDiary ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                {isDiary ? <><FaLock size={10} /> Private</> : <><FaGlobeAmericas size={10} /> Public Post</>}
            </div>
        </div>

        {/* Paper / Card View */}
        <div className={`flex-1 rounded-3xl shadow-xl border p-8 md:p-12 overflow-y-auto ${isDiary ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-200'}`}>

            {/* Main Content */}
            <article className={`prose prose-sm md:prose-sm max-w-none leading-relaxed  whitespace-pre-wrap break-words ${isDiary ? 'text-amber-900 font-serif' : 'text-slate-700'}`}>
                {post.content}
            </article>

        </div>
    </div>
  )
}