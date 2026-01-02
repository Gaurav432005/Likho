import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import Masonry from "react-masonry-css"; 
import { PostCard } from "./PostCard";
import { Button } from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { FaLock } from "react-icons/fa";

export default function Diary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time Listener Fix
  useEffect(() => {
    if (!user) return;

    const q = query(
        collection(db, "diary"), 
        where("userId", "==", user.uid), 
        orderBy("timestamp", "desc")
    );

    // Using onSnapshot for instant updates when deleting/adding
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    }, (error) => {
        console.error("Diary Error:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const breakpointColumns = { default: 3, 1100: 2, 700: 1 };

  if (loading) return <div className="py-20 text-center text-slate-400">Loading secrets...</div>;

  return (
    <div className="pb-20">
       <div className="flex items-center gap-3 mb-6 px-2">
           <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm border border-amber-200">
               <FaLock />
           </div>
           <div>
               <h1 className="text-2xl font-bold text-slate-900">My Diary</h1>
               <p className="text-xs text-slate-500 font-medium">Private & Secure</p>
           </div>
       </div>

       {entries.length === 0 ? (
         <div className="text-center py-24 bg-amber-50/50 rounded-3xl border border-dashed border-amber-200 mx-2">
            <h3 className="font-bold text-amber-900 mb-2 text-lg">Empty Diary</h3>
            <p className="text-amber-700/60 text-sm mb-6">Write your first secret note.</p>
            <Button variant="secondary" onClick={() => navigate('/create', { state: { isDiary: true } })}>Write Entry</Button>
         </div>
       ) : (
         <Masonry breakpointCols={breakpointColumns} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
           {entries.map(entry => <PostCard key={entry.id} note={entry} isDiary={true} />)}
         </Masonry>
       )}
    </div>
  );
}