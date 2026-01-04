import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection, doc, onSnapshot, serverTimestamp, query, orderBy,
  updateDoc, getDocs, writeBatch, limit, startAfter, where, setDoc, getDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  FaArrowLeft, FaPaperPlane, FaTrash, FaEllipsisV, FaReply, FaPen,
  FaTimes, FaImage, FaSpinner, FaCheck, FaCheckDouble
} from "react-icons/fa";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { toast } from "react-hot-toast";
import { uploadToCloudinary } from "../../services/cloudinary";

const MSG_LIMIT = 25;

export default function ChatWindow() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [otherUid, setOtherUid] = useState(null);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, msgId: null });
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const oldestMsgRef = useRef(null);

  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ---------------- CHAT META & OTHER USER ---------------- */

  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const unsub = onSnapshot(doc(db, "chats", chatId), async (snap) => {
      if (!snap.exists()) {
        navigate("/chat");
        return;
      }
      const data = snap.data();
      const uid = data.users.find(u => u !== user.uid);
      
      if (uid !== otherUid) {
        setOtherUid(uid);
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) setOtherUser({ uid: userSnap.id, ...userSnap.data() });
      }
    });

    return unsub;
  }, [chatId, user?.uid, navigate, otherUid]);

  /* ---------------- MESSAGES LISTENER ---------------- */

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(MSG_LIMIT)
    );

    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          // Firebase serverTimestamp logic fix
          createdAt: d.data().createdAt?.toDate() || new Date()
        }))
        .reverse();

      setMessages(msgs);

      // Initial Load setting
      if (snap.docs.length > 0 && !oldestMsgRef.current) {
        oldestMsgRef.current = snap.docs[snap.docs.length - 1];
      }
      setIsInitialLoad(false);
    });

    return unsub;
  }, [chatId]); // Removed isInitialLoad from deps to prevent re-subscriptions

  /* ---------------- READ RECEIPTS (Optimized) ---------------- */

  useEffect(() => {
    const markAsRead = async () => {
      const unread = messages.filter(m => !m.read && m.senderId !== user?.uid);
      if (unread.length === 0) return;

      const batch = writeBatch(db);
      unread.forEach(m => {
        batch.update(doc(db, "chats", chatId, "messages", m.id), { read: true });
      });
      
      try {
        await batch.commit();
        // Also update the main chat document to reflect "seen" status
        await updateDoc(doc(db, "chats", chatId), { receiverHasRead: true });
      } catch (e) { console.error(e); }
    };

    const timeoutId = setTimeout(markAsRead, 1000); // 1 sec delay to prevent batch spam
    return () => clearTimeout(timeoutId);
  }, [messages.length, chatId, user?.uid]);

  /* ---------------- PAGINATION ---------------- */

  const handleScroll = async e => {
    if (e.currentTarget.scrollTop === 0 && !loadingMore && hasMore && oldestMsgRef.current) {
      setLoadingMore(true);
      const prevHeight = e.currentTarget.scrollHeight;

      const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(oldestMsgRef.current),
        limit(MSG_LIMIT)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMore(false);
      } else {
        const older = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date()
        })).reverse();

        oldestMsgRef.current = snap.docs[snap.docs.length - 1];
        setMessages(prev => [...older, ...prev]);

        requestAnimationFrame(() => {
          if(containerRef.current)
            containerRef.current.scrollTop = containerRef.current.scrollHeight - prevHeight;
        });
      }
      setLoadingMore(false);
    }
  };

  useLayoutEffect(() => {
    if (!loadingMore && containerRef.current && isInitialLoad) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length, loadingMore, isInitialLoad]);

  /* ---------------- SEND/EDIT MESSAGE ---------------- */

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text && !isUploading) return;

    setNewMessage("");
    setReplyingTo(null);
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    const chatRef = doc(db, "chats", chatId);
    const batch = writeBatch(db);

    if (editingMsg) {
      batch.update(doc(db, "chats", chatId, "messages", editingMsg.id), { text, isEdited: true });
      batch.update(chatRef, { lastMessage: text });
      setEditingMsg(null);
    } else {
      const msgRef = doc(collection(db, "chats", chatId, "messages"));
      batch.set(msgRef, {
        text,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false,
        replyTo: replyingTo || null
      });
      batch.update(chatRef, {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        receiverHasRead: false
      });
    }

    try { await batch.commit(); } catch (e) { toast.error("Failed to send"); }
  };

  /* ---------------- IMAGE UPLOAD ---------------- */

  const handleImageSelect = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const tid = toast.loading("Uploading image...");

    try {
      const url = await uploadToCloudinary(file);
      const batch = writeBatch(db);
      const msgRef = doc(collection(db, "chats", chatId, "messages"));

      batch.set(msgRef, {
        image: url,
        text: "",
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false
      });

      batch.update(doc(db, "chats", chatId), {
        lastMessage: "📷 Photo",
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid,
        receiverHasRead: false
      });

      await batch.commit();
      toast.success("Sent", { id: tid });
    } catch {
      toast.error("Upload failed", { id: tid });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 w-full overflow-hidden">
      {/* HEADER */}
      <header className="h-20 bg-white border-b flex items-center px-4 gap-3 shadow-sm z-10">
        <button onClick={() => navigate("/chat")} className="p-2 hover:bg-slate-100 rounded-full transition-all">
          <FaArrowLeft className="text-slate-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar src={otherUser?.photoURL} name={otherUser?.displayName} size="md" />
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 leading-none">
                {otherUser?.displayName || "Loading..."}
            </h3>
            <span className="text-xs text-green-500 font-medium mt-1">Online</span>
          </div>
        </div>
        <button className="p-2 text-slate-400" onClick={() => setShowChatMenu(!showChatMenu)}>
          <FaEllipsisV />
        </button>
      </header>

      {/* MESSAGES */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        onClick={() => setSelectedMsgId(null)}
      >
        {loadingMore && <div className="flex justify-center py-2"><FaSpinner className="animate-spin text-indigo-500" /></div>}

        {messages.map(msg => {
          const isMe = msg.senderId === user.uid;
          const isSelected = selectedMsgId === msg.id;

          return (
            <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] group relative p-3 rounded-2xl transition-all shadow-sm ${
                  isMe ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border text-slate-800 rounded-tl-none"
                } ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMsgId(isSelected ? null : msg.id);
                }}
              >
                {msg.replyTo && (
                    <div className="mb-2 p-2 rounded bg-black/10 text-xs border-l-2 border-indigo-500 italic">
                        <p className="font-bold not-italic">{msg.replyTo.senderName}</p>
                        {msg.replyTo.text}
                    </div>
                )}
                {msg.image && (
                  <img src={msg.image} className="rounded-lg mb-2 max-h-60 w-full object-cover" loading="lazy" />
                )}
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className="text-[10px] mt-1 flex justify-end items-center gap-1 opacity-70">
                  {isMe && (msg.read ? <FaCheckDouble className="text-indigo-400" /> : <FaCheck />)}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* INPUT */}
      <footer className="p-4 border-t bg-white shadow-2xl">
        {replyingTo && (
             <div className="flex items-center justify-between bg-slate-100 p-2 rounded-t-xl border-x border-t text-xs">
                <span className="truncate">Replying to <b>{replyingTo.senderName}</b></span>
                <button onClick={() => setReplyingTo(null)}><FaTimes /></button>
             </div>
        )}
        <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current.click()} className="p-3 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
            <FaImage />
            </button>
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageSelect} />

            <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2">
                <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={e => {
                    setNewMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                }}
                rows={1}
                className="w-full bg-transparent resize-none outline-none text-sm py-1 max-h-32"
                placeholder="Type a message..."
                />
            </div>

            <button 
                onClick={sendMessage}
                disabled={!newMessage.trim() && !isUploading}
                className="p-3 bg-indigo-600 text-white rounded-full disabled:opacity-50 hover:bg-indigo-700 transition-all shadow-md"
            >
            <FaPaperPlane size={18} />
            </button>
        </div>
      </footer>

      {/* DELETE MODAL */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, msgId: null })}
        title="Delete Message"
      >
        <div className="p-4 text-center">
            <p className="text-slate-600 mb-6">Are you sure? This will delete the message for everyone.</p>
            <div className="flex gap-3">
                <button className="flex-1 p-2 border rounded-lg" onClick={() => setDeleteModal({ isOpen: false })}>Cancel</button>
                <button className="flex-1 p-2 bg-red-500 text-white rounded-lg" onClick={handleDeleteMessage}>Delete</button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
