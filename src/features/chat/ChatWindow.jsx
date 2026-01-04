import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { 
    collection, doc, onSnapshot, serverTimestamp, 
    query, orderBy, updateDoc, deleteDoc, getDocs, writeBatch, limitToLast, where, startAfter, limit, endBefore 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { FaArrowLeft, FaPaperPlane, FaTrash, FaEllipsisV, FaReply, FaPen, FaTimes, FaImage, FaSpinner, FaCheck, FaCheckDouble, FaSmile, FaRegSmile } from "react-icons/fa";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { toast } from "react-hot-toast";
import EmojiPicker from 'emoji-picker-react'; 
import { uploadToCloudinary } from "../../services/cloudinary"; 

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];
const MSG_LIMIT = 25;

export default function ChatWindow() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null); 
  const [otherUid, setOtherUid] = useState(null);

  // UX States
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, msgId: null });
  const [selectedMsgId, setSelectedMsgId] = useState(null); 
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [deleteChatModal, setDeleteChatModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 
  const [showReactionBar, setShowReactionBar] = useState(false); 

  const [replyingTo, setReplyingTo] = useState(null); 
  const [editingMsg, setEditingMsg] = useState(null); 
  
  // Infinite Scroll Refs
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const oldestMsgDocRef = useRef(null);
  
  const containerRef = useRef(null); 
  const textareaRef = useRef(null); 
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null); 

  // --- DATA FETCHING ---
  
  // 1. Fetch Chat Metadata & Read Status
  useEffect(() => {
    if (!user?.uid || !chatId) return;
    const unsubChat = onSnapshot(doc(db, "chats", chatId), (chatDoc) => {
        if(!chatDoc.exists()) {
            navigate('/chat');
            return;
        }
        const data = chatDoc.data();
        const foundUid = data.users?.find(u => u !== user.uid);
        if (foundUid) setOtherUid(foundUid);

        // Mark chat as read globally if last message is from other user
        if (data.lastMessageSenderId && data.lastMessageSenderId !== user.uid && data.receiverHasRead === false) {
            updateDoc(chatDoc.ref, { receiverHasRead: true }).catch(() => {});
        }
    });
    return () => unsubChat();
  }, [chatId, user?.uid, navigate]); 

  // 2. Fetch Other User Profile
  useEffect(() => {
    if (!otherUid) return;
    const unsubUser = onSnapshot(doc(db, "users", otherUid), (userDoc) => {
        if (userDoc.exists()) setOtherUser({ uid: userDoc.id, ...userDoc.data() });
    });
    return () => unsubUser();
  }, [otherUid]);

  // 3. Main Message Listener (Real-time for newest messages)
  useEffect(() => {
    const q = query(
        collection(db, "chats", chatId, "messages"), 
        orderBy("createdAt", "desc"),
        limit(MSG_LIMIT)
    );
    
    const unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => ({
            id: d.id, 
            ...d.data(),
            // Handle the null-timestamp flicker during server sync
            createdAt: d.data().createdAt?.toDate() || new Date(), 
            pending: d.metadata.hasPendingWrites
        })).reverse();

        setMessages(msgs);
        if (isInitialLoad) {
            oldestMsgDocRef.current = snap.docs[snap.docs.length - 1];
            setIsInitialLoad(false);
        }
    });
    return () => unsub();
  }, [chatId]);

  // 4. Mark Messages as Read
  useEffect(() => {
    const unreadIds = messages
        .filter(m => m.senderId !== user?.uid && !m.read && m.id)
        .map(m => m.id);

    if (unreadIds.length > 0) {
        const batch = writeBatch(db);
        unreadIds.forEach(id => {
            batch.update(doc(db, "chats", chatId, "messages", id), { read: true });
        });
        batch.commit().catch(e => console.error("Read receipt error", e));
    }
  }, [messages, chatId, user?.uid]);

  // --- ACTIONS ---

  const handleScroll = async (e) => {
      if (e.currentTarget.scrollTop === 0 && !loadingMore && hasMore && oldestMsgDocRef.current) {
          setLoadingMore(true);
          const prevHeight = e.currentTarget.scrollHeight;

          const nextQ = query(
              collection(db, "chats", chatId, "messages"),
              orderBy("createdAt", "desc"),
              startAfter(oldestMsgDocRef.current),
              limit(MSG_LIMIT)
          );

          const snap = await getDocs(nextQ);
          if (snap.empty) {
              setHasMore(false);
          } else {
              const olderMsgs = snap.docs.map(d => ({
                  id: d.id, ...d.data(),
                  createdAt: d.data().createdAt?.toDate() || new Date()
              })).reverse();
              
              oldestMsgDocRef.current = snap.docs[snap.docs.length - 1];
              setMessages(prev => [...olderMsgs, ...prev]);
              
              // Maintain scroll position
              setTimeout(() => {
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight - prevHeight;
                }
              }, 0);
          }
          setLoadingMore(false);
      }
  };

  const sendMessage = async (e) => {
    if(e) e.preventDefault();
    const text = newMessage.trim();
    if (!text && !isUploading) return;
    
    setNewMessage(""); 
    setReplyingTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    try {
        const batch = writeBatch(db);
        const chatRef = doc(db, "chats", chatId);

        if (editingMsg) {
            const msgRef = doc(db, "chats", chatId, "messages", editingMsg.id);
            batch.update(msgRef, { text, isEdited: true });
            setEditingMsg(null);
        } else {
            const msgRef = doc(collection(db, "chats", chatId, "messages"));
            const msgData = {
                text,
                senderId: user.uid,
                createdAt: serverTimestamp(),
                read: false,
                reactions: {},
                replyTo: replyingTo || null
            };
            batch.set(msgRef, msgData);
            batch.update(chatRef, {
                lastMessage: text,
                lastMessageTime: serverTimestamp(),
                lastMessageSenderId: user.uid,
                receiverHasRead: false
            });
        }
        await batch.commit();
    } catch (err) {
        toast.error("Failed to send");
        setNewMessage(text);
    }
  };

  const handleImageSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsUploading(true);
      const tid = toast.loading("Uploading image...");
      try {
          const url = await uploadToCloudinary(file);
          const msgRef = doc(collection(db, "chats", chatId, "messages"));
          await setDoc(msgRef, {
              text: "",
              image: url,
              senderId: user.uid,
              createdAt: serverTimestamp(),
              read: false,
              reactions: {}
          });
          toast.success("Sent", { id: tid });
      } catch (err) {
          toast.error("Upload failed", { id: tid });
      } finally {
          setIsUploading(false);
      }
  };

  const handleDeleteMessage = async () => {
      if(!deleteModal.msgId) return;
      const id = deleteModal.msgId;
      setDeleteModal({ isOpen: false, msgId: null });
      try {
          const batch = writeBatch(db);
          // Update replies that point to this
          const replies = await getDocs(query(collection(db, "chats", chatId, "messages"), where("replyTo.id", "==", id)));
          replies.forEach(r => batch.update(r.ref, { "replyTo.text": "🚫 Deleted", "replyTo.image": null }));
          
          batch.delete(doc(db, "chats", chatId, "messages", id));
          await batch.commit();
      } catch (e) { toast.error("Delete failed"); }
  };

  // --- AUTO SCROLL ---
  useLayoutEffect(() => {
      if (containerRef.current && !loadingMore) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 w-full overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center px-4 gap-3 z-40 shadow-sm">
            <button onClick={() => navigate('/chat')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><FaArrowLeft /></button>
            <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => navigate(`/profile/${otherUser?.uid}`)}>
                <Avatar src={otherUser?.photoURL} name={otherUser?.displayName} size="md" />
                <div>
                    <h3 className="font-bold text-slate-900 text-sm md:text-base">{otherUser?.displayName || "Loading..."}</h3>
                    <p className="text-[10px] text-green-500 font-medium">Online</p>
                </div>
            </div>
            <div className="relative">
                <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><FaEllipsisV /></button>
                {showChatMenu && (
                    <div className="absolute right-0 top-12 bg-white shadow-xl border border-slate-100 rounded-xl w-48 py-2 z-50">
                        <button onClick={() => setDeleteChatModal(true)} className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 flex items-center gap-2"><FaTrash /> Delete Conversation</button>
                    </div>
                )}
            </header>

        {/* MESSAGES AREA */}
        <main 
            ref={containerRef} 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar scroll-smooth"
            onClick={() => { setSelectedMsgId(null); setShowEmojiPicker(false); }}
        >
            {loadingMore && <div className="flex justify-center"><FaSpinner className="animate-spin text-indigo-500" /></div>}
            
            {messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                const isSelected = selectedMsgId === msg.id;

                return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`relative group max-w-[80%] ${isMe ? 'bg-slate-900 text-white rounded-2xl rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-none'} p-3 shadow-sm transition-all ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                             onClick={(e) => { e.stopPropagation(); setSelectedMsgId(isSelected ? null : msg.id); }}>
                            
                            {msg.replyTo && (
                                <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 bg-black/5 border-slate-400 line-clamp-2 italic`}>
                                    <p className="font-bold not-italic">{msg.replyTo.senderName}</p>
                                    {msg.replyTo.text}
                                </div>
                            )}

                            {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-h-60 w-full object-cover" alt="attachment" />}
                            
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                            
                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span>{msg.createdAt instanceof Date ? msg.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                                {isMe && (msg.read ? <FaCheckDouble className="text-blue-400" /> : <FaCheck />)}
                            </div>

                            {/* Floating Action Menu */}
                            {isSelected && (
                                <div className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} flex bg-white border border-slate-200 rounded-full shadow-lg p-1 z-10 animate-pop`}>
                                    <button onClick={() => setReplyingTo({ id: msg.id, text: msg.text || "Photo", senderName: isMe ? "You" : otherUser?.displayName })} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><FaReply size={12}/></button>
                                    {isMe && <button onClick={() => {setEditingMsg(msg); setNewMessage(msg.text);}} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><FaPen size={12}/></button>}
                                    {isMe && <button onClick={() => setDeleteModal({ isOpen: true, msgId: msg.id })} className="p-2 hover:bg-slate-100 rounded-full text-red-500"><FaTrash size={12}/></button>}
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </main>

        {/* INPUT AREA */}
        <footer className="bg-white border-t border-slate-200 p-3 pb-6">
            {(replyingTo || editingMsg) && (
                <div className="flex items-center justify-between bg-slate-100 p-2 rounded-t-lg border-x border-t border-slate-200 text-xs">
                    <span className="truncate">
                        <b className="text-indigo-600">{editingMsg ? "Editing" : "Replying"}:</b> {editingMsg ? editingMsg.text : replyingTo.text}
                    </span>
                    <button onClick={() => {setReplyingTo(null); setEditingMsg(null); setNewMessage("");}}><FaTimes /></button>
                </div>
            )}
            <div className="flex items-end gap-2 max-w-5xl mx-auto relative">
                <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><FaImage /></button>
                <input type="file" hidden ref={fileInputRef} onChange={handleImageSelect} accept="image/*" />
                
                <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2 flex items-center border border-transparent focus-within:border-slate-300 focus-within:bg-white transition-all">
                    <textarea 
                        ref={textareaRef}
                        rows={1}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type a message..."
                        className="w-full bg-transparent resize-none py-1 outline-none text-sm max-h-32"
                    />
                </div>

                <button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() && !isUploading}
                    className="p-3 bg-slate-900 text-white rounded-full disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                >
                    {editingMsg ? <FaCheck /> : <FaPaperPlane />}
                </button>
            </div>
        </footer>

        {/* MODALS */}
        <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, msgId: null })} title="Delete Message">
            <p className="text-sm text-slate-600 mb-4">This will remove the message for everyone. This action cannot be undone.</p>
            <div className="flex gap-2">
                <button className="flex-1 p-2 bg-slate-100 rounded-lg font-bold" onClick={() => setDeleteModal({ isOpen: false })}>Cancel</button>
                <button className="flex-1 p-2 bg-red-500 text-white rounded-lg font-bold" onClick={handleDeleteMessage}>Delete</button>
            </div>
        </Modal>
    </div>
  );
}
