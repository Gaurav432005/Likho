import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { collection, doc, onSnapshot, addDoc, serverTimestamp, query, orderBy, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { FaArrowLeft, FaPaperPlane, FaTrash, FaEllipsisV } from "react-icons/fa";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { toast } from "react-hot-toast";

export default function ChatWindow() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null); 
  
  // UX States
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, msgId: null });
  const [selectedMsgId, setSelectedMsgId] = useState(null); 
  const [showChatMenu, setShowChatMenu] = useState(false); // Three dots menu state
  const [deleteChatModal, setDeleteChatModal] = useState(false); // Full chat delete modal
  
  const bottomRef = useRef(null);
  const textareaRef = useRef(null); 

  // 1. Fetch Chat & User
  useEffect(() => {
    const unsubChat = onSnapshot(doc(db, "chats", chatId), (chatDoc) => {
        if(chatDoc.exists()) {
            const data = chatDoc.data();
            const otherUid = data.users.find(u => u !== user.uid);
            
            if (data.lastMessageSenderId && data.lastMessageSenderId !== user.uid && data.receiverHasRead === false) {
                updateDoc(chatDoc.ref, { receiverHasRead: true }).catch(console.error);
            }

            if (otherUid) {
                const unsubUser = onSnapshot(doc(db, "users", otherUid), (userDoc) => {
                    if (userDoc.exists()) setOtherUser({ uid: userDoc.id, ...userDoc.data() });
                });
                return () => unsubUser();
            }
        } else {
            // Chat deleted by someone else
            // navigate('/chat'); // Optional: redirect immediately
        }
    });
    return () => unsubChat();
  }, [chatId, user]);

  // 2. Fetch Messages
  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
        setMessages(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [chatId]);

  // 3. Auto Scroll
  useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Auto-Resize Textarea
  useEffect(() => {
      if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
      }
  }, [newMessage]);

  const sendMessage = async (e) => {
    if(e) e.preventDefault(); // Prevent default if called from event
    
    if (!newMessage.trim()) return;
    const text = newMessage;
    setNewMessage(""); 
    
    // Keep Focus
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
    }

    try {
        await addDoc(collection(db, "chats", chatId, "messages"), {
            text,
            senderId: user.uid,
            createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "chats", chatId), {
            lastMessage: text,
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: user.uid,
            receiverHasRead: false 
        });
    } catch (err) {
        toast.error("Failed to send");
        setNewMessage(text);
    }
  };

  // FIX: Handle Enter Key to Send
  const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
      }
  };

  const handleDeleteMessage = async () => {
      if(!deleteModal.msgId) return;
      try {
          await deleteDoc(doc(db, "chats", chatId, "messages", deleteModal.msgId));
          toast.success("Message deleted");
      } catch(err) { toast.error("Failed to delete"); }
      finally { setDeleteModal({ isOpen: false, msgId: null }); }
  };

  // FIX: Delete Entire Chat Logic
  const handleDeleteChat = async () => {
      try {
          await deleteDoc(doc(db, "chats", chatId));
          toast.success("Conversation deleted");
          navigate('/chat');
      } catch (err) {
          toast.error("Failed to delete chat");
      }
  };

  const handleProfileClick = () => {
      if (otherUser?.uid) navigate(`/profile/${otherUser.uid}`);
  };

  const handleMessageTap = (msgId, isMe) => {
      if (!isMe) return;
      setSelectedMsgId(selectedMsgId === msgId ? null : msgId);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white w-full">
        
        {/* --- HEADER --- */}
        <div className="shrink-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center px-4 gap-3 z-30 relative shadow-sm">
            <button 
                onClick={() => navigate('/chat')} 
                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
                <FaArrowLeft />
            </button>
            
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={handleProfileClick}>
                <Avatar src={otherUser?.photoURL} name={otherUser?.displayName} size="md" />
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 leading-tight text-sm md:text-base truncate">
                        {otherUser?.displayName || "Loading..."}
                    </h3>
                
                </div>
            </div>

            {/* FIX: Three Dots Menu */}
            <div className="relative">
                <button 
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <FaEllipsisV />
                </button>
                
                {showChatMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowChatMenu(false)} />
                        <div className="absolute right-0 top-10 bg-white shadow-xl border border-slate-100 rounded-xl w-40 z-20 overflow-hidden py-1">
                            <button 
                                onClick={() => { setDeleteChatModal(true); setShowChatMenu(false); }}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <FaTrash size={12} /> Delete Chat
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* --- MESSAGES --- */}
        <div 
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e8e9ec] scroll-smooth"
            onClick={() => setSelectedMsgId(null)}
        >
            {messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                const avatarSrc = isMe ? user?.photoURL : otherUser?.photoURL;
                const avatarName = isMe ? user?.displayName : otherUser?.displayName;
                const isSelected = selectedMsgId === msg.id;

                return (
                    <div key={msg.id} className={`flex w-full animate-fade-in ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {!isMe && <Avatar src={avatarSrc} name={avatarName} size="xs" className="mb-1 shrink-0" />}
                            
                            <div 
                                onClick={(e) => { e.stopPropagation(); handleMessageTap(msg.id, isMe); }}
                                className={`relative px-4 py-2.5 text-sm font-medium leading-relaxed shadow-sm break-words cursor-pointer transition-all ${
                                isMe 
                                ? 'bg-slate-900 text-white rounded-2xl rounded-br-none' 
                                : 'bg-white text-slate-800 rounded-2xl rounded-bl-none border border-slate-200'
                            } ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}>
                                
                                {msg.text}
                                
                                {isMe && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, msgId: msg.id }); }}
                                        className={`absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 bg-white/80 rounded-full shadow-sm transition-all duration-200 ${
                                            isSelected ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-75 md:group-hover:opacity-100 md:group-hover:visible md:group-hover:scale-100'
                                        }`}
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
            <div ref={bottomRef} />
        </div>

        {/* --- INPUT --- */}
        <div className="shrink-0 bg-white border-t border-slate-200 p-2 md:p-3 pb-safe z-20">
            <form onSubmit={sendMessage} className="flex gap-2 items-end max-w-4xl mx-auto">
                <div className="flex-1 bg-slate-100 rounded-[1.5rem] px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:bg-white transition-all shadow-inner border border-transparent focus-within:border-slate-200">
                    <textarea 
                        ref={textareaRef}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown} // FIX: Added Enter Key Listener
                        placeholder="Message..."
                        className="w-full bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 resize-none max-h-[120px] py-2"
                        rows={1}
                        style={{ minHeight: '40px' }}
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={!newMessage.trim()} 
                    className="bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-black active:scale-95 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:shadow-none shrink-0 mb-1"
                >
                    <FaPaperPlane size={16} className="ml-0.5" />
                </button>
            </form>
        </div>

        {/* Delete Message Modal */}
        <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, msgId: null })} title="Delete Message">
            <p className="text-slate-600 mb-6">Remove this message? This action cannot be undone.</p>
            <div className="flex gap-3">
                <button onClick={() => setDeleteModal({ isOpen: false, msgId: null })} className="flex-1 py-3 border border-slate-200 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDeleteMessage} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-red-200 shadow-lg">Delete</button>
            </div>
        </Modal>

        {/* FIX: Delete Chat Modal */}
        <Modal isOpen={deleteChatModal} onClose={() => setDeleteChatModal(false)} title="Delete Conversation">
            <p className="text-slate-600 mb-6">Are you sure you want to delete this entire conversation? It will be removed from your list.</p>
            <div className="flex gap-3">
                <button onClick={() => setDeleteChatModal(false)} className="flex-1 cursor-pointer py-3 border border-slate-200 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDeleteChat} className="flex-1 py-3 bg-red-500 cursor-pointer text-white font-bold rounded-xl hover:bg-red-600 shadow-red-200 shadow-lg">Delete All</button>
            </div>
        </Modal>
    </div>
  );
}