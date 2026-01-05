import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { 
  collection, query, where, onSnapshot, orderBy, 
  getDocs, addDoc, serverTimestamp, getDoc, doc
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import { Loading } from "../../components/ui/Loading";
import { EmptyState } from "../../components/ui/EmptyState";
import { FormInput } from "../../components/ui/FormInput";
import { FaSearch, FaUserPlus, FaPaperPlane } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Real-time chat listener
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "chats"), 
      where("users", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => {
        const data = doc.data();
        if (!data.users || !Array.isArray(data.users)) return null;

        const otherUid = data.users.find(u => u !== user.uid);
        const otherUser = data.participantDetails?.[otherUid] || { 
          displayName: "Unknown", 
          photoURL: null 
        };

        const isUnread = data.lastMessageSenderId && 
                         data.lastMessageSenderId !== user.uid && 
                         !data.readBy?.includes(user.uid);

        return { 
          id: doc.id, 
          ...data, 
          otherUser, 
          otherUid, 
          isUnread,
          timeString: formatTime(data.lastMessageTime)
        };
      }).filter(Boolean);

      chatData.sort((a, b) => {
        const timeA = a.lastMessageTime?.seconds || 0;
        const timeB = b.lastMessageTime?.seconds || 0;
        return timeB - timeA;
      });

      setChats(chatData);
      setLoading(false);
    }, (error) => {
      console.error("Chat listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Search for users
  const handleUserSearch = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const q = query(
        collection(db, "users"),
        where("displayName", ">=", term),
        where("displayName", "<=", term + "\uf8ff"),
        orderBy("displayName")
      );
      
      let snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const filtered = results.filter(u => u.id !== user?.uid);
      setSearchResults(filtered);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleStartChat = async (otherUser) => {
    try {
      const existingChat = chats.find(c => c.otherUid === otherUser.id);
      if (existingChat) {
        navigate(`/chat/${existingChat.id}`);
        return;
      }

      const chatRef = await addDoc(collection(db, "chats"), {
        users: [user.uid, otherUser.id].sort(),
        participantDetails: {
          [user.uid]: {
            displayName: user.displayName,
            photoURL: user.photoURL
          },
          [otherUser.id]: {
            displayName: otherUser.displayName,
            photoURL: otherUser.photoURL
          }
        },
        lastMessage: "",
        lastMessageSenderId: null,
        lastMessageTime: serverTimestamp(),
        readBy: []
      });

      setShowUserSearch(false);
      setSearchTerm("");
      navigate(`/chat/${chatRef.id}`);
    } catch (error) {
      console.error("Chat creation error:", error);
      toast.error("Failed to start chat");
    }
  };

  if (loading) return <Loading message="Loading chats..." />;

  const filteredChats = chats.filter(c =>
    c.otherUser?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Messages</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <FormInput 
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={FaSearch}
            />
          </div>
          <button
            onClick={() => setShowUserSearch(!showUserSearch)}
            className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <FaUserPlus /> New Chat
          </button>
        </div>
      </div>

      {/* User Search */}
      {showUserSearch && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200"
        >
          <FormInput 
            type="text"
            placeholder="Search by name or email..."
            onChange={(e) => handleUserSearch(e.target.value)}
            autoFocus
            icon={FaSearch}
          />
          
          {searchingUsers && <div className="mt-4 text-center text-slate-500">Searching...</div>}
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.slice(0, 5).map(u => (
                <div 
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={u.photoURL} name={u.displayName} size="sm" />
                    <div>
                      <p className="font-semibold text-slate-900">{u.displayName}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartChat(u)}
                    className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <EmptyState 
          icon={FaPaperPlane}
          title="No conversations yet"
          description="Start a new chat with someone!"
          actionLabel="Find Users"
          onAction={() => setShowUserSearch(true)}
        />
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredChats.map(chat => (
            <Link 
              key={chat.id}
              to={`/chat/${chat.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="relative">
                <Avatar src={chat.otherUser?.photoURL} name={chat.otherUser?.displayName} size="md" />
                {chat.isUnread && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-600 rounded-full border-2 border-white"></div>}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className={`font-semibold truncate ${chat.isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                    {chat.otherUser?.displayName}
                  </h3>
                  <span className={`text-xs whitespace-nowrap ${chat.isUnread ? 'text-primary-600 font-semibold' : 'text-slate-400'}`}>
                    {chat.timeString}
                  </span>
                </div>
                <p className={`text-sm truncate ${chat.isUnread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                  {chat.lastMessage || "No messages yet"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
