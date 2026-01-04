import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { 
    collection, doc, onSnapshot, serverTimestamp, 
    query, orderBy, updateDoc, deleteDoc, getDocs, writeBatch, limitToLast, where 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { FaArrowLeft, FaPaperPlane, FaTrash, FaEllipsisV, FaReply, FaPen, FaTimes, FaImage, FaSpinner, FaCheck, FaCheckDouble, FaSmile, FaRegSmile } from "react-icons/fa";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { toast } from "react-hot-toast";
import EmojiPicker from 'emoji-picker-react'; 
import { uploadToCloudinary } from "../../services/cloudinary"; 

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

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
  
  // --- INFINITE SCROLL STATES ---
  const [msgLimit, setMsgLimit] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollPositionRef = useRef(null);
  
  const containerRef = useRef(null); 
  const textareaRef = useRef(null); 
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null); 

  // --- STYLES ---
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .animate-pop { animation: pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
      const handleClickOutside = (event) => {
          if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
              setShowEmojiPicker(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- DATA FETCHING ---
  
  useEffect(() => {
    if (!user?.uid || !chatId) return;
    const unsubChat = onSnapshot(doc(db, "chats", chatId), (chatDoc) => {
        if(chatDoc.exists()) {
            const data = chatDoc.data();
            if (data.users && Array.isArray(data.users)) {
                const foundUid = data.users.find(u => u !== user.uid);
                if (foundUid && foundUid !== otherUid) setOtherUid(foundUid);
            }
            if (data.lastMessageSenderId && data.lastMessageSenderId !== user.uid && data.receiverHasRead === false) {
                updateDoc(chatDoc.ref, { receiverHasRead: true }).catch(err => console.log("Read receipt err", err));
            }
        } else { navigate('/chat'); }
    });
    return () => unsubChat();
  }, [chatId, user, navigate]); 

  useEffect(() => {
    if (!otherUid) return;
    const unsubUser = onSnapshot(doc(db, "users", otherUid), (userDoc) => {
        if (userDoc.exists()) setOtherUser({ uid: userDoc.id, ...userDoc.data() });
    });
    return () => unsubUser();
  }, [otherUid]);

  useEffect(() => {
    if (msgLimit === 20) setIsInitialLoad(true);

    const q = query(
        collection(db, "chats", chatId, "messages"), 
        orderBy("createdAt", "asc"),
        limitToLast(msgLimit)
    );
    
    const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
        const msgs = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, ...data,
                createdAt: data.createdAt || new Date(), 
                pending: d.metadata.hasPendingWrites,
                reactions: data.reactions || {} 
            };
        });
        setMessages(msgs);
        setLoadingMore(false);
    });
    return () => unsub();
  }, [chatId, msgLimit]);

  useEffect(() => {
    const unreadMessages = messages.filter(msg => msg.senderId !== user?.uid && !msg.read);
    if (unreadMessages.length > 0) {
        const timeoutId = setTimeout(async () => {
            const batch = writeBatch(db);
            let updateCount = 0;
            unreadMessages.forEach(msg => {
                const docRef = doc(db, "chats", chatId, "messages", msg.id);
                batch.update(docRef, { read: true });
                updateCount++;
            });
            if(updateCount > 0) {
                try { await batch.commit(); } catch (error) { console.error("Batch read error", error); }
            }
        }, 1000);
        return () => clearTimeout(timeoutId);
    }
  }, [messages.length, chatId, user?.uid]); 

  // --- SCROLL LOGIC ---
  const handleScroll = (e) => {
      const { scrollTop, scrollHeight } = e.currentTarget;
      if (scrollTop === 0 && !loadingMore && messages.length >= msgLimit) {
          setLoadingMore(true);
          scrollPositionRef.current = scrollHeight;
          setMsgLimit(prev => prev + 20);
      }
  };

  useLayoutEffect(() => {
      if (!containerRef.current) return;
      if (isInitialLoad && messages.length > 0) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
          setTimeout(() => setIsInitialLoad(false), 100);
          return;
      }
      if (scrollPositionRef.current !== null) {
          const newScrollHeight = containerRef.current.scrollHeight;
          const diff = newScrollHeight - scrollPositionRef.current;
          containerRef.current.scrollTop = diff;
          scrollPositionRef.current = null;
          return;
      }
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      const lastMsg = messages[messages.length - 1];
      
      if (isNearBottom || lastMsg?.senderId === user.uid) {
          containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
      }
  }, [messages, isInitialLoad]);

  useEffect(() => {
      if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
      }
  }, [newMessage]);

  const formatTime = (timestamp) => {
      if (!timestamp) return "";
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputEmojiClick = (emojiData) => setNewMessage(prev => prev + emojiData.emoji);

  const handleReaction = async (msgId, emoji) => {
      const msgRef = doc(db, "chats", chatId, "messages", msgId);
      const msg = messages.find(m => m.id === msgId);
      if(!msg) return;
      const currentReactions = { ...msg.reactions };
      if (currentReactions[user.uid] === emoji) delete currentReactions[user.uid];
      else currentReactions[user.uid] = emoji;
      try {
          await updateDoc(msgRef, { reactions: currentReactions });
          setSelectedMsgId(null); 
          setShowReactionBar(false);
      } catch (err) { toast.error("Failed to react"); }
  };

  const handleImageSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setIsUploading(true);
      const toastId = toast.loading("Sending photo...");
      
      try {
          const imageUrl = await uploadToCloudinary(file); 
          if(!imageUrl) throw new Error("Upload failed");

          const batch = writeBatch(db);
          const msgRef = doc(collection(db, "chats", chatId, "messages"));
          
          batch.set(msgRef, {
              text: "", 
              image: imageUrl, 
              senderId: user.uid,
              createdAt: serverTimestamp(), 
              read: false, 
              reactions: {},
              replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName } : null
          });

          const chatRef = doc(db, "chats", chatId);
          batch.update(chatRef, {
              lastMessage: "📷 Photo", 
              lastMessageTime: serverTimestamp(), 
              lastMessageSenderId: user.uid, 
              receiverHasRead: false 
          });

          await batch.commit();
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
    
    const text = newMessage.trim();
    setNewMessage(""); 
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = "40px";
    textareaRef.current?.focus();

    if (editingMsg) {
        const msgIdToEdit = editingMsg.id;
        setEditingMsg(null);
        try {
            const batch = writeBatch(db);
            const msgRef = doc(db, "chats", chatId, "messages", msgIdToEdit);
            batch.update(msgRef, { text: text, isEdited: true });

            // Also update any replies pointing to this message (Optional but good UX)
            const repliesQuery = query(collection(db, "chats", chatId, "messages"), where("replyTo.id", "==", msgIdToEdit));
            const repliesSnap = await getDocs(repliesQuery);
            repliesSnap.forEach(r => batch.update(r.ref, { "replyTo.text": text }));

            const lastMsgCheck = messages[messages.length - 1];
            if (lastMsgCheck?.id === msgIdToEdit) {
                const chatRef = doc(db, "chats", chatId);
                batch.update(chatRef, { lastMessage: text });
            }
            await batch.commit();
        } catch(err) { 
            toast.error("Failed to edit"); 
            setNewMessage(text); 
            setEditingMsg({ id: msgIdToEdit, text: text }); 
        }
    } else {
        const currentReply = replyingTo ? { ...replyingTo } : null;
        setReplyingTo(null);
        
        try {
            const batch = writeBatch(db);
            const msgRef = doc(collection(db, "chats", chatId, "messages"));
            batch.set(msgRef, {
                text, 
                senderId: user.uid, 
                createdAt: serverTimestamp(), 
                read: false, 
                reactions: {}, 
                replyTo: currentReply
            });

            const chatRef = doc(db, "chats", chatId);
            batch.update(chatRef, {
                lastMessage: text, 
                lastMessageTime: serverTimestamp(), 
                lastMessageSenderId: user.uid, 
                receiverHasRead: false 
            });

            await batch.commit();
        } catch (err) { 
            console.error(err);
            toast.error("Failed to send"); 
            setNewMessage(text); 
        }
    }
  };

  const handleReply = (msg) => {
     const senderName = msg.senderId === user.uid ? "You" : otherUser?.displayName || "User";
     setReplyingTo({ id: msg.id, text: msg.image ? "📷 Photo" : msg.text, senderName });
     setEditingMsg(null); setSelectedMsgId(null); textareaRef.current?.focus();
  };

  const handleEdit = (msg) => {
     if(msg.image) { toast.error("Cannot edit images"); return; }
     setEditingMsg({ id: msg.id, text: msg.text }); setNewMessage(msg.text); 
     setReplyingTo(null); setSelectedMsgId(null); textareaRef.current?.focus();
  };

  const cancelAction = () => { setReplyingTo(null); setEditingMsg(null); setNewMessage(""); if (textareaRef.current) textareaRef.current.style.height = "40px"; };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  // --- LOGIC FIX: Hard Delete but Update References ---
  const handleDeleteMessage = async () => {
      if(!deleteModal.msgId) return;
      const msgId = deleteModal.msgId;
      setDeleteModal({ isOpen: false, msgId: null });
      
      try {
          const batch = writeBatch(db);
          
          // 1. Find all messages that Replied to this message
          const repliesQuery = query(
            collection(db, "chats", chatId, "messages"), 
            where("replyTo.id", "==", msgId)
          );
          const repliesSnapshot = await getDocs(repliesQuery);

          // 2. Update their reply bubble text to "Deleted"
          repliesSnapshot.forEach((doc) => {
             batch.update(doc.ref, {
                 "replyTo.text": "🚫 Original message deleted",
                 // Optionally clear the image flag so it shows text instead of trying to show image
                 "replyTo.senderName": "Deleted User" // Optional: hide sender name too if needed
             });
          });

          // 3. HARD DELETE the original message
          const msgRef = doc(db, "chats", chatId, "messages", msgId);
          batch.delete(msgRef);
          
          // 4. Update Chat Preview (Last Message) if needed
          const messagesSnapshot = [...messages]; 
          const lastMsgInList = messagesSnapshot[messagesSnapshot.length - 1];
          if (lastMsgInList?.id === msgId) {
             const newLastMsg = messagesSnapshot[messagesSnapshot.length - 2];
             const chatRef = doc(db, "chats", chatId);
             if (newLastMsg) {
                 const newText = newLastMsg.image ? "📷 Photo" : newLastMsg.text;
                 batch.update(chatRef, { 
                    lastMessage: newText,
                    lastMessageTime: newLastMsg.createdAt,
                    lastMessageSenderId: newLastMsg.senderId
                 }); 
             } else {
                 batch.update(chatRef, { lastMessage: "", lastMessageSenderId: "", lastMessageTime: null });
             }
          }

          await batch.commit();

      } catch(err) { 
          console.error(err);
          toast.error("Failed to delete"); 
      }
  };

  const handleDeleteChat = async () => {
      const toastId = toast.loading("Deleting conversation...");
      try {
          const snapshot = await getDocs(collection(db, "chats", chatId, "messages"));
          const CHUNK_SIZE = 400;
          const chunks = [];
          
          for (let i = 0; i < snapshot.docs.length; i += CHUNK_SIZE) {
              chunks.push(snapshot.docs.slice(i, i + CHUNK_SIZE));
          }
  
          for (const chunk of chunks) {
              const batch = writeBatch(db);
              chunk.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
          }
  
          await deleteDoc(doc(db, "chats", chatId));
  
          toast.success("Conversation deleted", { id: toastId });
          navigate('/chat');
      } catch (err) {
          console.error(err);
          toast.error("Failed to delete chat", { id: toastId });
      }
  };

  const handleMessageTap = (msgId) => { 
      if (selectedMsgId === msgId) { setSelectedMsgId(null); } 
      else { setSelectedMsgId(msgId); setShowReactionBar(false); }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white w-full overflow-hidden">
        
        {/* HEADER */}
        <div className="shrink-0 h-20 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center px-4 gap-3 z-40 relative shadow-sm">
            <button onClick={() => navigate('/chat')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"><FaArrowLeft /></button>
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => otherUser && navigate(`/profile/${otherUser.uid}`)}>
                <Avatar src={otherUser?.photoURL} name={otherUser?.displayName} size="md" />
                <h3 className="font-bold text-slate-900 leading-tight text-sm md:text-base truncate">{otherUser?.displayName || "Loading..."}</h3>
            </div>
            <div className="relative">
                <button onClick={() => setShowChatMenu(!showChatMenu)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><FaEllipsisV /></button>
                {showChatMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowChatMenu(false)} />
                        <div className="absolute right-0 top-10 bg-white shadow-xl border border-slate-100 rounded-xl w-40 z-50 overflow-hidden py-1">
                            <button onClick={() => { setDeleteChatModal(true); setShowChatMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><FaTrash size={12} /> Delete Chat</button>
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* MESSAGES */}
        <div 
            ref={containerRef} 
            onScroll={handleScroll}
            onClick={() => { setSelectedMsgId(null); setShowEmojiPicker(false); setShowReactionBar(false); }} 
            className={`flex-1 overflow-y-auto p-4 space-y-3 bg-[#e8e9ec] z-0 no-scrollbar transition-opacity duration-300 ${isInitialLoad && messages.length > 0 ? 'opacity-0' : 'opacity-100'}`}
        >
            {loadingMore && <div className="w-full flex justify-center py-2"><FaSpinner className="animate-spin text-slate-500" /></div>}

            {messages.length === 0 && !isInitialLoad && <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50"><p className="text-sm">No messages yet. Say hi!</p></div>}

            {messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                const isSelected = selectedMsgId === msg.id;
                const reactionList = Object.entries(msg.reactions || {});
                
                return (
                    <div key={msg.id} className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                                <div className="relative group min-w-0"> 
                              
                                    <div onClick={(e) => { e.stopPropagation(); handleMessageTap(msg.id); }} className={`relative px-3 py-2 text-sm shadow-sm transition-all ${isMe ? 'bg-slate-900 text-white rounded-2xl rounded-br-none' : 'bg-white text-slate-800 rounded-2xl rounded-bl-none border border-slate-200'} ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#e8e9ec]' : ''}`}>
                                                
                                            {/* Reply Bubble */}
                                            {msg.replyTo && (
                                                <div className={`mb-2 rounded-lg p-2 text-xs border-l-4 ${isMe ? 'bg-slate-800 border-indigo-400 text-slate-300' : 'bg-slate-100 border-indigo-500 text-slate-600'}`}>
                                                    <p className="font-bold mb-0.5 opacity-90">{msg.replyTo.senderName}</p>
                                                    {/* Agar deleted hoga to text yahi update ho chuka hoga database me */}
                                                    <p className="line-clamp-1 opacity-80 italic">{msg.replyTo.text}</p>
                                                </div>
                                            )}

                                            {msg.image && <div className="mb-1 rounded-lg overflow-hidden"><img src={msg.image} alt="Sent" className="w-full h-auto max-h-[300px] object-cover" loading="lazy" /></div>}
                                            
                                            <div className="flex flex-wrap items-end gap-2">
                                                {msg.text && (
                                  
                                                    <div className="font-medium leading-relaxed whitespace-pre-wrap break-words overflow-hidden max-w-full">
                                                        {msg.text}
                                                    </div>
                                                )}
                                                <div className={`text-[10px] flex items-center gap-1 ml-auto shrink-0 ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                                                    {msg.createdAt && <span>{formatTime(msg.createdAt)}</span>}
                                                    {msg.isEdited && <span>(edit)</span>}
                                                    {isMe && <span className={`${msg.read ? 'text-blue-400' : 'text-slate-500'}`}>{msg.pending ? <FaSpinner className="animate-spin"/> : (msg.read ? <FaCheckDouble size={12} /> : <FaCheck size={10} />)}</span>}
                                                </div>
                                            </div>
                                    </div>

                                    {reactionList.length > 0 && (
                                        <div className={`absolute -bottom-3 ${isMe ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'} z-10`}>
                                            <div className="bg-white border border-slate-200 shadow-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-xs">
                                                {reactionList.map(([uid, emoji]) => <span key={uid}>{emoji}</span>)}
                                                <span className="text-slate-500 font-semibold text-[10px]">{reactionList.length > 1 ? reactionList.length : ''}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- SIDE MENU --- */}
                                    {isSelected && (
                                        <div className={`absolute top-0 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} z-50 flex items-center h-full animate-pop`}>
                                            {showReactionBar ? (
                                                <div className="bg-white p-1.5 rounded-full shadow-xl border border-slate-100 flex items-center gap-1">
                                                    {QUICK_REACTIONS.map(emoji => (
                                                        <button 
                                                            key={emoji} 
                                                            onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                            className={`p-2 hover:bg-slate-100 rounded-full text-xl transition-transform hover:scale-125 ${msg.reactions?.[user.uid] === emoji ? 'bg-indigo-100' : ''}`}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 bg-white p-1 rounded-full shadow-xl border border-slate-100">
                                                    <button onClick={(e) => { e.stopPropagation(); handleReply(msg); }} className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full">
                                                        <FaReply size={14} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setShowReactionBar(true); }} className="p-2 text-slate-600 hover:text-yellow-500 hover:bg-slate-100 rounded-full">
                                                        <FaRegSmile size={14} />
                                                    </button>
                                                    {isMe && !msg.image && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(msg); }} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-full">
                                                            <FaPen size={12} />
                                                        </button>
                                                    )}
                                                    {isMe && (
                                                        <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, msgId: msg.id }); }} className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-full">
                                                            <FaTrash size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>

        {/* INPUT */}
        <div className="shrink-0 bg-white border-t border-slate-200 z-30 ">
            {(replyingTo || editingMsg) && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between animate-slide-up">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="text-slate-500">{editingMsg ? <FaPen size={14} /> : <FaReply size={14} />}</div>
                        <div className="flex flex-col text-sm border-l-2 border-slate-400 pl-2">
                            <span className="font-bold text-slate-600">{editingMsg ? "Editing" : `Replying to ${replyingTo.senderName}`}</span>
                            <span className="text-slate-500 truncate max-w-[200px]">{editingMsg ? editingMsg.text : replyingTo.text}</span>
                        </div>
                    </div>
                    <button onClick={cancelAction} className="p-2 text-slate-400 hover:text-slate-600"><FaTimes /></button>
                </div>
            )}
            <div className="p-2 w-full min-h-20 h-auto flex justify-center items-end relative">
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-[80px] left-2 z-50 shadow-2xl rounded-2xl border border-slate-200">
                        <EmojiPicker onEmojiClick={handleInputEmojiClick} theme="light" width={300} height={400} />
                    </div>
                )}
                <form onSubmit={sendMessage} className="flex gap-2 items-end w-full max-w-4xl">
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`hidden md:flex mb-1 w-10 h-10 rounded-full items-center justify-center transition-all shrink-0 ${showEmojiPicker ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><FaSmile size={20} /></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="mb-1 bg-slate-100 text-slate-500 w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-all shrink-0">{isUploading ? <FaSpinner className="animate-spin" /> : <FaImage size={18} />}</button>
                    <div className="flex-1 bg-slate-100 rounded-3xl px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:bg-white transition-all shadow-inner border border-transparent focus-within:border-slate-200">
                        <textarea ref={textareaRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message..." className="w-full bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 resize-none max-h-[120px] py-2" rows={1} style={{ minHeight: '40px' }} />
                    </div>
                    <button type="submit" disabled={!newMessage.trim()} className={`mb-1 bg-slate-900 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black active:scale-95 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:shadow-none shrink-0 ${editingMsg ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}>{editingMsg ? <FaPen size={14} /> : <FaPaperPlane size={16} className="ml-0.5" />}</button>
                </form>
            </div>
        </div>

        {/* MODALS */}
        <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, msgId: null })} title="Delete Message">
            <p className="text-slate-600 mb-6">Remove this message?</p>
            <div className="flex gap-3"><button onClick={() => setDeleteModal({ isOpen: false, msgId: null })} className="flex-1 py-3 border border-slate-200 font-bold rounded-xl hover:bg-slate-50">Cancel</button><button onClick={handleDeleteMessage} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600">Delete</button></div>
        </Modal>
        <Modal isOpen={deleteChatModal} onClose={() => setDeleteChatModal(false)} title="Delete Conversation">
            <p className="text-slate-600 mb-6">Delete entire conversation?</p>
            <div className="flex gap-3"><button onClick={() => setDeleteChatModal(false)} className="flex-1 py-3 border border-slate-200 font-bold rounded-xl hover:bg-slate-50">Cancel</button><button onClick={handleDeleteChat} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600">Delete All</button></div>
        </Modal>
    </div>
  );
}
