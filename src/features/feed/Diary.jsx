import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
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

  useEffect(() => {
    if (!user) return;
    const fetchDiary = async () => {
        const q = query(collection(db, "diary"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };
    fetchDiary();
  }, [user]);

const breakpointColumns = { default: 3, 1100: 2, 700: 1 };

  if (loading) return <div className="py-20 text-center">Loading secrets...</div>;

  return (
    <div className="pb-20">


       {entries.length === 0 ? (
         <div className="text-center py-20 bg-amber-50/50 rounded-3xl border border-dashed border-amber-200">
            <h3 className="font-bold text-amber-900 mb-2">Empty Diary</h3>
            <Button variant="ghost" onClick={() => navigate('/create', { state: { mode: 'diary' } })}>Write Entry</Button>
         </div>
       ) : (
         <Masonry breakpointCols={breakpointColumns} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
           {entries.map(entry => <PostCard key={entry.id} note={entry} isDiary={true} />)}
         </Masonry>
       )}
    </div>
  );
}