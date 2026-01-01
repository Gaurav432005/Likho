import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, getDocs, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import { FaSearch, FaCommentDots, FaUserPlus, FaSpinner } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // New States for Global Search
  const [globalUsers, setGlobalUsers] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // 1. Fetch Existing Chats
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"), 
      where("users", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => {
        const data = doc.data();
        const otherUid = data.users.find(u => u !== user.uid);
        const otherUser = data.participantDetails?.[otherUid] || { name: "User", photoURL: null };
        
        const isUnread = 
            data.lastMessageSenderId && 
            data.lastMessageSenderId !== user.uid && 
            data.receiverHasRead === false;

        return { id: doc.id, ...data, otherUser, isUnread };
      });
      setChats(chatData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Global Search Logic (CASE INSENSITIVE FIX)
  useEffect(() => {
      if (!search.trim()) {
          setGlobalUsers([]);
          return;
      }

      const fetchGlobalUsers = async () => {
          setIsSearchingGlobal(true);
          try {
              // FIX: Firestore doesn't support case-insensitive search natively.
              // We fetch a batch of users and filter in JavaScript for best UX.
              const usersRef = collection(db, "users");
              // Fetching recent 100 users to filter (Safe for MVP)
              const q = query(usersRef, limit(100)); 
              
              const snapshot = await getDocs(q);
              
              const searchLower = search.toLowerCase();

              const results = snapshot.docs
                  .map(doc => ({ uid: doc.id, ...doc.data() }))
                  .filter(u => 
                      u.uid !== user.uid && // Exclude self
                      u.displayName?.toLowerCase().includes(searchLower) // Case Insensitive Match
                  );

              setGlobalUsers(results);
          } catch (err) {
              console.error("Global search error:", err);
          } finally {
              setIsSearchingGlobal(false);
          }
      };

      const delayDebounceFn = setTimeout(() => {
          fetchGlobalUsers();
      }, 500); 

      return () => clearTimeout(delayDebounceFn);
  }, [search, user]);

  const handleStartChat = async (targetUser) => {
      const existingChat = chats.find(c => c.users.includes(targetUser.uid));
      
      if (existingChat) {
          navigate(`/chat/${existingChat.id}`);
      } else {
          const toastId = toast.loading("Starting chat...");
          try {
             const newChat = await addDoc(collection(db, "chats"), {
                  users: [user.uid, targetUser.uid],
                  participantDetails: {
                      [user.uid]: { name: user.displayName, photoURL: user.photoURL },
                      [targetUser.uid]: { name: targetUser.displayName, photoURL: targetUser.photoURL || null }
                  },
                  lastMessage: "Started a conversation",
                  lastMessageSenderId: user.uid,
                  lastMessageTime: serverTimestamp(),
                  receiverHasRead: false
              });
              toast.dismiss(toastId);
              navigate(`/chat/${newChat.id}`);
          } catch(err) {
              console.error(err);
              toast.error("Failed to start chat", { id: toastId });
          }
      }
  };

  // 3. Filter Existing Chats (Also Case Insensitive)
  const filteredChats = chats.filter(chat => 
      chat.otherUser.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pb-24">
       
       <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6 sticky top-0 z-10">
           <h1 className="text-2xl font-bold text-slate-900 mb-4">Messages</h1>
           <div className="relative">
               <FaSearch className="absolute left-4 top-3.5 text-slate-400" />
               <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages or people..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-colors"
               />
           </div>
       </div>

       <div className="space-y-6">
           {loading ? (
               <div className="text-center py-20 text-slate-400">Loading chats...</div>
           ) : (
               <>
                  {/* Global Search Results */}
                  {search.trim() && (
                      <div className="animate-fade-in">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                              Global Search Results
                          </h3>
                          
                          {isSearchingGlobal ? (
                              <div className="flex items-center gap-2 text-slate-400 px-4 py-2">
                                  <FaSpinner className="animate-spin" /> Searching...
                              </div>
                          ) : globalUsers.length === 0 ? (
                              <p className="text-slate-400 text-sm px-4 italic">No new people found.</p>
                          ) : (
                              <div className="space-y-2 mb-6">
                                  {globalUsers.map(gUser => (
                                      <div 
                                          key={gUser.uid}
                                          onClick={() => handleStartChat(gUser)}
                                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                                      >
                                          <div className="flex items-center gap-3">
                                              <Avatar src={gUser.photoURL} name={gUser.displayName} size="md" />
                                              <div>
                                                  <h4 className="font-bold text-slate-900">{gUser.displayName}</h4>
                                                  <p className="text-xs text-slate-500">Tap to message</p>
                                              </div>
                                          </div>
                                          <div className="p-2 bg-white rounded-full text-slate-400 group-hover:text-indigo-600 transition-colors">
                                              <FaUserPlus />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                          <div className="h-px bg-slate-100 my-4" />
                      </div>
                  )}

                  {/* Existing Chats */}
                  <div>
                    {search.trim() && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Your Chats</h3>}
                    
                    {filteredChats.length === 0 && !search.trim() ? (
                       <div className="flex flex-col items-center justify-center py-10 text-center">
                           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                               <FaCommentDots size={30} />
                           </div>
                           <h3 className="text-slate-900 font-bold mb-1">No messages yet</h3>
                           <p className="text-slate-500 text-sm mb-6">Search above to find people!</p>
                       </div>
                    ) : filteredChats.length === 0 && search.trim() ? (
                        <p className="text-slate-400 text-sm px-4 italic">No existing chats match "{search}"</p>
                    ) : (
                       filteredChats.map(chat => (
                           <Link 
                              key={chat.id} 
                              to={`/chat/${chat.id}`}
                              className={`block bg-white p-4 rounded-2xl border transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] mb-2 ${
                                  chat.isUnread ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-100'
                              }`}
                           >
                               <div className="flex items-center gap-4">
                                   <Avatar 
                                      src={chat.otherUser.photoURL} 
                                      name={chat.otherUser.name} 
                                      size="md" 
                                   />
                                   
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-baseline mb-1">
                                           <h3 className={`text-sm truncate ${chat.isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                               {chat.otherUser.name}
                                           </h3>
                                           <span className={`text-[10px] ${chat.isUnread ? 'font-bold text-indigo-600' : 'text-slate-400'}`}>
                                               {chat.lastMessageTime?.seconds 
                                                  ? new Date(chat.lastMessageTime.seconds * 1000).toLocaleDateString(undefined, {month:'short', day:'numeric'}) 
                                                  : ''}
                                           </span>
                                       </div>
                                       <div className="flex justify-between items-center">
                                           <p className={`text-sm truncate max-w-[85%] ${chat.isUnread ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                                               {chat.lastMessageSenderId === user.uid ? "You: " : ""} 
                                               {chat.lastMessage || "Started a chat"}
                                           </p>
                                           {chat.isUnread && (
                                               <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse shadow-sm shadow-indigo-300"></span>
                                           )}
                                       </div>
                                   </div>
                               </div>
                           </Link>
                       ))
                    )}
                  </div>
               </>
           )}
       </div>
    </div>
  );
}