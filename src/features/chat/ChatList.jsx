import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy, 
  getDocs, limit, addDoc, serverTimestamp, startAt, endAt 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import { Loading } from "../../components/ui/Loading";
import { FaSearch, FaUserPlus, FaArrowRight, FaArrowDown } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [globalResults, setGlobalResults] = useState([]);
  
  // Pagination State
  const [chatLimit, setChatLimit] = useState(15);
  const [hasMoreChats, setHasMoreChats] = useState(true);

  // Helper: Capitalize for better search (Firestore workaround)
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // 1. Fetch Chats (Real-time)
  useEffect(() => {
    if (!user) return;

    // ERROR NOTE: Agar console me "The query requires an index" aaye, 
    // to link par click karke Index bana lena.
    const q = query(
      collection(db, "chats"), 
      where("users", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc"),
      limit(chatLimit)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Safety Checks
        if (!data.users || !Array.isArray(data.users)) return null;

        const otherUid = data.users.find(u => u !== user.uid);
        
        // Fallback agar details missing ho
        const otherUser = data.participantDetails?.[otherUid] || { 
            name: "Unknown User", 
            photoURL: null 
        };

        const isUnread = data.lastMessageSenderId && 
                         data.lastMessageSenderId !== user.uid && 
                         data.receiverHasRead === false;

        return { id: doc.id, ...data, otherUser, otherUid, isUnread };
      }).filter(Boolean);

      setChats(chatData);
      setLoading(false);
      
      // Pagination Logic check
      if(snapshot.docs.length < chatLimit) setHasMoreChats(false);
      else setHasMoreChats(true);
    });

    return () => unsubscribe();
  }, [user, chatLimit]);

  // 2. Global Search (Optimized)
  useEffect(() => {
      if (!searchTerm.trim()) { setGlobalResults([]); return; }
      
      const timer = setTimeout(async () => {
          try {
            // FIX: Search term ko capitalize kar rahe hain taaki "rahul" likhne par "Rahul" mile
            const formattedSearch = capitalize(searchTerm.trim());

            const q = query(
                collection(db, "users"),
                orderBy("displayName"),
                startAt(formattedSearch),
                endAt(formattedSearch + "\uf8ff"),
                limit(10)
            );

            const snap = await getDocs(q);
            
            // Check if we are already chatting with these users
            const existingIds = new Set(chats.map(c => c.otherUid));
            
            const results = snap.docs
                .map(d => ({ uid: d.id, ...d.data() }))
                .filter(u => u.uid !== user.uid && !existingIds.has(u.uid));

            setGlobalResults(results);
          } catch (err) {
            console.error("Search Error (Index missing mostly):", err);
          }
      }, 500); // 500ms Debounce
      return () => clearTimeout(timer);
  }, [searchTerm, user, chats]);

  // 3. Handle Start Chat
  const handleStartNewChat = async (targetUser) => {
      if(!targetUser.uid) return;
      const toastId = toast.loading("Starting chat...");

      // Check 1: Client side (Fastest)
      const existingChat = chats.find(c => c.otherUid === targetUser.uid);
      if (existingChat) {
          toast.dismiss(toastId);
          navigate(`/chat/${existingChat.id}`);
          setSearchTerm("");
          return;
      }

      try {
          // Check 2: Server side (Safe)
          const q = query(
            collection(db, "chats"), 
            where("users", "array-contains", user.uid)
          );
          const snap = await getDocs(q);
          const dbExistingChat = snap.docs.find(doc => {
              const data = doc.data();
              return data.users.includes(targetUser.uid);
          });

          if (dbExistingChat) {
              toast.dismiss(toastId);
              navigate(`/chat/${dbExistingChat.id}`);
              setSearchTerm("");
              return;
          }

          // Create NEW Chat
          const newChat = await addDoc(collection(db, "chats"), {
              users: [user.uid, targetUser.uid],
              participantDetails: { 
                  [user.uid]: { name: user.displayName || "User", photoURL: user.photoURL || null }, 
                  [targetUser.uid]: { name: targetUser.displayName || "User", photoURL: targetUser.photoURL || null } 
              },
              lastMessage: "👋 Started conversation", 
              lastMessageSenderId: user.uid, 
              lastMessageTime: serverTimestamp(), 
              receiverHasRead: false
          });
          
          toast.success("Chat created!", { id: toastId });
          navigate(`/chat/${newChat.id}`);
          setSearchTerm("");

      } catch(e) { 
          console.error(e);
          toast.error("Error starting chat", { id: toastId }); 
      }
  };

  // Filter loaded chats based on search
  const filteredChats = chats.filter(c => 
      c.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24">
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6 sticky top-0 z-10">
           <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{chats.length}</span>
           </div>
           
           <div className="relative">
               <FaSearch className="absolute left-4 top-3.5 text-slate-400" />
               <input 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
                 placeholder="Search friend or find new..." 
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 font-medium" 
               />
           </div>
       </div>

       {loading ? <Loading message="Loading Chats..." /> : (
           <div className="space-y-4 px-1">
              
              {/* Existing Chats */}
              {filteredChats.map(chat => (
                  <Link key={chat.id} to={`/chat/${chat.id}`} className={`block bg-white p-4 rounded-2xl border transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${chat.isUnread ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100'}`}>
                       <div className="flex items-center gap-4">
                           <Avatar src={chat.otherUser.photoURL} name={chat.otherUser.name} size="md" />
                           <div className="flex-1 min-w-0">
                               <div className="flex justify-between mb-1">
                                   <h3 className={`text-sm truncate ${chat.isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                       {chat.otherUser.name}
                                   </h3>
                                   {/* Time logic can be added here if available in chat object */}
                               </div>
                               <div className="flex justify-between items-center">
                                   <p className={`text-sm truncate max-w-[85%] ${chat.isUnread ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                                      {chat.lastMessageSenderId === user.uid ? <span className="text-slate-400">You: </span> : ""} 
                                      {chat.lastMessage}
                                   </p>
                                   {chat.isUnread && <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse shadow-sm shadow-indigo-300"></span>}
                               </div>
                           </div>
                       </div>
                  </Link>
              ))}

              {/* Global Search Results */}
              {searchTerm.trim() && globalResults.length > 0 && (
                  <div className="mt-8 animate-fade-in">
                      <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-2 tracking-wider">New People</h3>
                      {globalResults.map(gUser => (
                          <div key={gUser.uid} onClick={() => handleStartNewChat(gUser)} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors mb-3 shadow-sm hover:shadow-md">
                              <div className="flex items-center gap-4">
                                  <Avatar src={gUser.photoURL} name={gUser.displayName} size="md" />
                                  <div>
                                      <h4 className="font-bold text-sm text-slate-900">{gUser.displayName}</h4>
                                      <p className="text-xs text-slate-400">Tap to message</p>
                                  </div>
                              </div>
                              <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                                  <FaUserPlus size={14} />
                              </div>
                          </div>
                      ))}
                  </div>
              )}
              
              {/* No Results State */}
              {searchTerm.trim() && filteredChats.length === 0 && globalResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 opacity-60">
                      <FaSearch size={24} className="mb-2" />
                      <p>No users found named "{searchTerm}"</p>
                  </div>
              )}

              {/* Load More Button */}
              {!searchTerm && hasMoreChats && (
                  <button onClick={() => setChatLimit(prev => prev + 15)} className="w-full py-4 text-slate-500 text-sm font-bold hover:text-indigo-600 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all">
                      <FaArrowDown /> Load More Chats
                  </button>
              )}
           </div>
       )}
    </div>
  );
}