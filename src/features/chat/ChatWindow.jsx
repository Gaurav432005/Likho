import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { 
    collection, doc, onSnapshot, addDoc, serverTimestamp, 
    query, orderBy, updateDoc, deleteDoc, getDocs, writeBatch 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
// FaCheck aur FaCheckDouble rakha hai Blue ticks ke liye
import { FaArrowLeft, FaPaperPlane, FaTrash, FaEllipsisV, FaReply, FaPen, FaTimes, FaImage, FaSpinner, FaCheck, FaCheckDouble } from "react-icons/fa";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { toast } from "react-hot-toast";

const CLOUD_NAME = "dwtj7toww"; 
const UPLOAD_PRESET = "likho_app"; 

export default function ChatWindow() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null); 
  
  // UX States
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, msgId: null });
  const [selectedMsgId, setSelectedMsgId] = useState(null); 
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [deleteChatModal, setDeleteChatModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState(null); 
  const [editingMsg, setEditingMsg] = useState(null); 
  
  const containerRef = useRef(null); 
  const textareaRef = useRef(null); 
  const fileInputRef = useRef(null);

  // --- HIDE SCROLLBAR STYLE ---
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // 1. Fetch Chat & User
  useEffect(() => {
    setIsInitialLoad(true);
    setMessages([]); 

    const unsubChat = onSnapshot(doc(db, "chats", chatId), (chatDoc) => {
        if(chatDoc.exists()) {
            const data = chatDoc.data();
            const otherUid = data.users.find(u => u !== user.uid);
            
            // Ye purana logic (Last message read status for chat list)
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
             navigate('/chat');
        }
    });
    return () => unsubChat();
  }, [chatId, user, navigate]);

  // 2. Fetch Messages
  useEffect(() => {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
        const msgs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setMessages(msgs);
    });
    return () => unsub();
  }, [chatId]);

  // --- MARK MESSAGES AS READ (BLUE TICKS LOGIC) ---
  useEffect(() => {
    const markMessagesAsRead = async () => {
        // Filter messages sent by OTHER user that are not read yet
        const unreadMessages = messages.filter(
            msg => msg.senderId !== user.uid && !msg.read
        );

        if (unreadMessages.length > 0) {
            const batch = writeBatch(db);
            unreadMessages.forEach(msg => {
                const msgRef = doc(db, "chats", chatId, "messages", msg.id);
                batch.update(msgRef, { read: true });
            });
            
            try {
                await batch.commit();
            } catch (error) {
                console.error("Error marking messages as read:", error);
            }
        }
    };

    if (messages.length > 0) {
        markMessagesAsRead();
    }
  }, [messages, chatId, user.uid]);

  // 3. MAGIC SCROLL LOGIC
  useLayoutEffect(() => {
      if (containerRef.current && messages.length > 0) {
          if (isInitialLoad) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
              setTimeout(() => setIsInitialLoad(false), 50);
          } else {
             containerRef.current.scrollTo({
                 top: containerRef.current.scrollHeight,
                 behavior: "smooth"
             });
          }
      }
  }, [messages, isInitialLoad, isUploading]);

  // 4. Auto-Resize Textarea
  useEffect(() => {
      if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
      }
  }, [newMessage]);

  // Helper to format Time
  const formatTime = (timestamp) => {
      if (!timestamp) return "";
      const date = timestamp.toDate();
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleImageSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(true);
      const toastId = toast.loading("Sending photo...");

      try {
          const imageUrl = await uploadImageToCloudinary(file); 
          if(!imageUrl) throw new Error("Upload failed");

          await addDoc(collection(db, "chats", chatId, "messages"), {
              text: "", 
              image: imageUrl, 
              senderId: user.uid,
              createdAt: serverTimestamp(),
              read: false, // Default unread
              replyTo: replyingTo ? {
                  id: replyingTo.id,
                  text: replyingTo.text, 
                  senderName: replyingTo.senderName
              } : null
          });

          await updateDoc(doc(db, "chats", chatId), {
              lastMessage: "📷 Photo",
              lastMessageTime: serverTimestamp(),
              lastMessageSenderId: user.uid,
              receiverHasRead: false 
          });

          setReplyingTo(null);
          toast.success("Sent!", { id: toastId });
      } catch (err) {
          console.error(err);
          toast.error("Failed to send image", { id: toastId });
      } finally {
          setIsUploading(false);
      }
  };

  const sendMessage = async (e) => {
    if(e) e.preventDefault();
    if (!newMessage.trim()) return;
    const text = newMessage;
    setNewMessage(""); 
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    textareaRef.current?.focus();

    try {
        if (editingMsg) {
            setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, text: text, isEdited: true } : m));
            setEditingMsg(null); 

            await updateDoc(doc(db, "chats", chatId, "messages", editingMsg.id), {
                text: text,
                isEdited: true
            });
            
            const lastMsgCheck = messages[messages.length - 1];
            if (lastMsgCheck.id === editingMsg.id) {
                 await updateDoc(doc(db, "chats", chatId), { lastMessage: text });
            }
        } else {
            const payload = {
                text,
                senderId: user.uid,
                createdAt: serverTimestamp(),
                read: false, // Default unread
                replyTo: replyingTo ? {
                    id: replyingTo.id,
                    text: replyingTo.text,
                    senderName: replyingTo.senderName
                } : null
            };

            await addDoc(collection(db, "chats", chatId, "messages"), payload);

            await updateDoc(doc(db, "chats", chatId), {
                lastMessage: text,
                lastMessageTime: serverTimestamp(),
                lastMessageSenderId: user.uid,
                receiverHasRead: false 
            });
            
            setReplyingTo(null);
        }
    } catch (err) {
        toast.error("Failed to send");
        setNewMessage(text);
    }
  };

  const handleReply = (msg) => {
     const senderName = msg.senderId === user.uid ? "You" : otherUser?.displayName;
     const displayText = msg.image ? "📷 Photo" : msg.text;
     setReplyingTo({ id: msg.id, text: displayText, senderName });
     setEditingMsg(null); setSelectedMsgId(null); textareaRef.current?.focus();
  };

  const handleEdit = (msg) => {
     if(msg.image) { toast.error("Cannot edit images"); return; }
     setEditingMsg({ id: msg.id, text: msg.text }); setNewMessage(msg.text); 
     setReplyingTo(null); setSelectedMsgId(null); textareaRef.current?.focus();
  };

  const cancelAction = () => {
     setReplyingTo(null); setEditingMsg(null); setNewMessage(""); 
     if (textareaRef.current) textareaRef.current.style.height = "40px";
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleDeleteMessage = async () => {
      if(!deleteModal.msgId) return;
      
      const msgId = deleteModal.msgId;
      const msgToDelete = messages.find(m => m.id === msgId);
      const isLastMessage = messages[messages.length - 1]?.id === msgId;

      setMessages(prev => prev.filter(m => m.id !== msgId));
      setDeleteModal({ isOpen: false, msgId: null });

      try {
          await deleteDoc(doc(db, "chats", chatId, "messages", msgId));

          if (isLastMessage) {
              const newLastMsg = messages[messages.length - 2]; 
              if (newLastMsg) {
                  const newText = newLastMsg.image ? "📷 Photo" : newLastMsg.text;
                  await updateDoc(doc(db, "chats", chatId), {
                      lastMessage: newText,
                      lastMessageTime: newLastMsg.createdAt,
                      lastMessageSenderId: newLastMsg.senderId,
                      receiverHasRead: true 
                  });
              } else {
                  await updateDoc(doc(db, "chats", chatId), {
                      lastMessage: "",
                      lastMessageTime: serverTimestamp(),
                      lastMessageSenderId: "",
                  });
              }
          }
          toast.success("Message deleted");
      } catch(err) { 
          toast.error("Failed to delete"); 
      }
  };

  const handleDeleteChat = async () => {
      const toastId = toast.loading("Deleting conversation...");
      try {
          const messagesRef = collection(db, "chats", chatId, "messages");
          const snapshot = await getDocs(messagesRef);
          
          const batch = writeBatch(db);
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          
          const chatRef = doc(db, "chats", chatId);
          batch.delete(chatRef);
          
          await batch.commit();

          toast.success("Conversation deleted", { id: toastId });
          navigate('/chat');
      } catch (err) {
          toast.error("Failed to delete chat", { id: toastId });
      }
  };

  const handleProfileClick = () => { if (otherUser?.uid) navigate(`/profile/${otherUser.uid}`); };
  const handleMessageTap = (msgId) => { setSelectedMsgId(selectedMsgId === msgId ? null : msgId); };

  return (
    <div className="flex flex-col h-[100dvh] bg-white w-full overflow-hidden">
        
        {/* --- HEADER --- */}
        <div className="shrink-0 h-20 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center px-4 gap-3 z-40 relative shadow-sm">
            <button onClick={() => navigate('/chat')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <FaArrowLeft />
            </button>
            
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={handleProfileClick}>
                {/* No Green Dot here anymore */}
                <Avatar src={otherUser?.photoURL} name={otherUser?.displayName} size="md" />
                
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 leading-tight text-sm md:text-base truncate">
                        {otherUser?.displayName || "Loading..."}
                    </h3>
                    {/* Online status text removed */}
                </div>
            </div>
            
            <div className="relative">
                <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                    <FaEllipsisV />
                </button>
                
                {showChatMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowChatMenu(false)} />
                        <div className="absolute right-0 top-10 bg-white shadow-xl border border-slate-100 rounded-xl w-40 z-50 overflow-hidden py-1">
                            <button onClick={() => { setDeleteChatModal(true); setShowChatMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <FaTrash size={12} /> Delete Chat
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* --- MESSAGES AREA --- */}
        <div 
            ref={containerRef}
            className={`flex-1 overflow-y-auto p-4 space-y-3 bg-[#e8e9ec] z-0 no-scrollbar ${
                isInitialLoad && messages.length > 0 ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={() => setSelectedMsgId(null)}
        >
            {messages.length === 0 && !isInitialLoad && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                    <p className="text-sm">No messages yet. Say hi!</p>
                </div>
            )}

            {messages.map((msg, index) => {
                const isMe = msg.senderId === user.uid;
                const avatarSrc = isMe ? user?.photoURL : otherUser?.photoURL;
                const avatarName = isMe ? user?.displayName : otherUser?.displayName;
                const isSelected = selectedMsgId === msg.id;
                
                return (
                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {!isMe && <Avatar src={avatarSrc} name={avatarName} size="xs" className="mb-1 shrink-0" />}
                            
                            <div className="relative group">
                                {/* Message Bubble */}
                                <div 
                                    onClick={(e) => { e.stopPropagation(); handleMessageTap(msg.id); }}
                                    className={`relative px-2 py-2 text-sm shadow-sm break-words cursor-pointer transition-all ${
                                    isMe 
                                    ? 'bg-slate-900 text-white rounded-2xl rounded-br-none' 
                                    : 'bg-white text-slate-800 rounded-2xl rounded-bl-none border border-slate-200'
                                } ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#e8e9ec]' : ''}`}
                                >
                                    
                                    {/* Reply Context */}
                                    {msg.replyTo && (
                                        <div className={`mb-2 rounded-lg p-2 text-xs border-l-4 ${isMe ? 'bg-slate-800 border-indigo-400 text-slate-300' : 'bg-slate-100 border-indigo-500 text-slate-600'}`}>
                                            <p className="font-bold mb-0.5 opacity-90">{msg.replyTo.senderName}</p>
                                            <p className="line-clamp-1 opacity-80">{msg.replyTo.text}</p>
                                        </div>
                                    )}

                                    {/* Image Content */}
                                    {msg.image && (
                                        <div className="mb-1 rounded-lg overflow-hidden">
                                            <img src={msg.image} alt="Sent image" className="w-full h-auto max-h-[300px] object-cover" loading="lazy" />
                                        </div>
                                    )}

                                    {/* Text Content */}
                                    <div className="flex flex-wrap items-end gap-2">
                                        {msg.text && (
                                            <span className="font-medium leading-relaxed whitespace-pre-wrap px-1">{msg.text}</span>
                                        )}
                                        
                                        {/* Time & Ticks (KEPT THIS!) */}
                                        <div className={`text-[10px] flex items-center gap-1 ml-auto shrink-0 ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {msg.createdAt && <span>{formatTime(msg.createdAt)}</span>}
                                            {msg.isEdited && <span>(edited)</span>}
                                            
                                            {/* Blue Ticks Logic */}
                                            {isMe && (
                                                <span className={`${msg.read ? 'text-blue-400' : 'text-slate-500'}`}>
                                                    {msg.read ? <FaCheckDouble size={12} /> : <FaCheck size={10} />}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ACTION MENU */}
                                {isSelected && (
                                    <div className={`absolute top-0 mt-1 ${isMe ? 'right-full' : 'left-full'} flex items-center gap-1 bg-white p-1 rounded-full shadow-xl border border-slate-100 animate-in fade-in zoom-in duration-200 z-50 min-w-[max-content]`}>
                                            <button onClick={(e) => { e.stopPropagation(); handleReply(msg); }} className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full">
                                                <FaReply size={14} />
                                            </button>

                                            {isMe && (
                                                <>
                                                    {!msg.image && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(msg); }} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full">
                                                            <FaPen size={12} />
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, msgId: msg.id }); }} className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-full">
                                                        <FaTrash size={12} />
                                                    </button>
                                                </>
                                            )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>

        {/* --- INPUT AREA --- */}
        <div className="shrink-0 bg-white border-t border-slate-200 z-30 ">
            {(replyingTo || editingMsg) && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between animate-slide-up">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="text-indigo-500">
                            {editingMsg ? <FaPen size={14} /> : <FaReply size={14} />}
                        </div>
                        <div className="flex flex-col text-sm border-l-2 border-indigo-400 pl-2">
                            <span className="font-bold text-indigo-600">
                                {editingMsg ? "Editing Message" : `Replying to ${replyingTo.senderName}`}
                            </span>
                            <span className="text-slate-500 truncate max-w-[200px] md:max-w-md">
                                {editingMsg ? editingMsg.text : replyingTo.text}
                            </span>
                        </div>
                    </div>
                    <button onClick={cancelAction} className="p-2 text-slate-400 hover:text-slate-600">
                        <FaTimes />
                    </button>
                </div>
            )}

            <div className="p-2 w-full h-20 flex justify-center">
                <form onSubmit={sendMessage} className="flex gap-2 items-center w-full ">
                    
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />

                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-slate-100 text-slate-500 w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-all shrink-0">
                        {isUploading ? <FaSpinner className="animate-spin" /> : <FaImage size={18} />}
                    </button>

                    <div className="flex-1 bg-slate-100 rounded-[1.5rem] px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:bg-white transition-all shadow-inner border border-transparent focus-within:border-slate-200">
                        <textarea 
                            ref={textareaRef}
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message..."
                            className="w-full bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 resize-none max-h-[120px] py-2"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                    </div>
                    
                    <button type="submit" disabled={!newMessage.trim()} className={`bg-slate-900 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-black active:scale-95 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:shadow-none shrink-0  ${editingMsg ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}>
                        {editingMsg ? <FaPen size={14} /> : <FaPaperPlane size={16} className="ml-0.5" />}
                    </button>
                </form>
            </div>
        </div>

        {/* Delete Modals same as before... */}
        <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, msgId: null })} title="Delete Message">
            <p className="text-slate-600 mb-6">Remove this message? This action cannot be undone.</p>
            <div className="flex gap-3">
                <button onClick={() => setDeleteModal({ isOpen: false, msgId: null })} className="flex-1 py-3 border border-slate-200 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDeleteMessage} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-red-200 shadow-lg">Delete</button>
            </div>
        </Modal>

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

// Upload Function (No Changes)
async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            console.error("Cloudinary Error:", data);
            throw new Error(data.error?.message || "Upload failed");
        }
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
}