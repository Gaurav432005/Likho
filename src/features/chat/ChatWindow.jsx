import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  getDocs,
  writeBatch,
  limit,
  startAfter,
  where,
  setDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  FaArrowLeft,
  FaPaperPlane,
  FaTrash,
  FaEllipsisV,
  FaReply,
  FaPen,
  FaTimes,
  FaImage,
  FaSpinner,
  FaCheck,
  FaCheckDouble
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

  /* ---------------- CHAT META ---------------- */

  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const unsub = onSnapshot(doc(db, "chats", chatId), snap => {
      if (!snap.exists()) {
        navigate("/chat");
        return;
      }
      const data = snap.data();
      const uid = data.users.find(u => u !== user.uid);
      setOtherUid(uid);
    });

    return unsub;
  }, [chatId, user?.uid, navigate]);

  /* ---------------- OTHER USER ---------------- */

  useEffect(() => {
    if (!otherUid) return;

    getDoc(doc(db, "users", otherUid)).then(snap => {
      if (snap.exists()) {
        setOtherUser({ uid: snap.id, ...snap.data() });
      }
    });
  }, [otherUid]);

  /* ---------------- MESSAGES ---------------- */

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
          createdAt: d.data().createdAt?.toDate() || new Date()
        }))
        .reverse();

      setMessages(msgs);

      if (isInitialLoad) {
        oldestMsgRef.current = snap.docs[snap.docs.length - 1];
        setIsInitialLoad(false);
      }
    });

    return unsub;
  }, [chatId, isInitialLoad]);

  /* ---------------- READ RECEIPTS ---------------- */

  useEffect(() => {
    const unread = messages.filter(
      m => !m.read && m.senderId !== user?.uid
    );

    if (!unread.length) return;

    const batch = writeBatch(db);
    unread.forEach(m => {
      batch.update(
        doc(db, "chats", chatId, "messages", m.id),
        { read: true }
      );
    });
    batch.commit().catch(() => {});
  }, [messages, chatId, user?.uid]);

  /* ---------------- SCROLL ---------------- */

  const handleScroll = async e => {
    if (
      e.currentTarget.scrollTop !== 0 ||
      loadingMore ||
      !hasMore ||
      !oldestMsgRef.current
    )
      return;

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
      const older = snap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() || new Date()
        }))
        .reverse();

      oldestMsgRef.current = snap.docs[snap.docs.length - 1];
      setMessages(prev => [...older, ...prev]);

      requestAnimationFrame(() => {
        containerRef.current.scrollTop =
          containerRef.current.scrollHeight - prevHeight;
      });
    }
    setLoadingMore(false);
  };

  useLayoutEffect(() => {
    if (!loadingMore && containerRef.current) {
      containerRef.current.scrollTop =
        containerRef.current.scrollHeight;
    }
  }, [messages.length, loadingMore]);

  /* ---------------- SEND MESSAGE ---------------- */

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text && !isUploading) return;

    setNewMessage("");
    setReplyingTo(null);
    textareaRef.current.style.height = "40px";

    const chatRef = doc(db, "chats", chatId);
    const batch = writeBatch(db);

    if (editingMsg) {
      batch.update(
        doc(db, "chats", chatId, "messages", editingMsg.id),
        { text, isEdited: true }
      );
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
        lastMessageSenderId: user.uid
      });
    }

    await batch.commit();
  };

  /* ---------------- IMAGE ---------------- */

  const handleImageSelect = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const tid = toast.loading("Uploading image...");

    try {
      const url = await uploadToCloudinary(file);
      const msgRef = doc(collection(db, "chats", chatId, "messages"));

      await setDoc(msgRef, {
        image: url,
        text: "",
        senderId: user.uid,
        createdAt: serverTimestamp(),
        read: false
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: "📷 Photo",
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: user.uid
      });

      toast.success("Sent", { id: tid });
    } catch {
      toast.error("Upload failed", { id: tid });
    } finally {
      setIsUploading(false);
    }
  };

  /* ---------------- DELETE ---------------- */

  const handleDeleteMessage = async () => {
    const id = deleteModal.msgId;
    setDeleteModal({ isOpen: false, msgId: null });

    const batch = writeBatch(db);
    const replies = await getDocs(
      query(
        collection(db, "chats", chatId, "messages"),
        where("replyTo.id", "==", id)
      )
    );

    replies.forEach(r =>
      batch.update(r.ref, {
        "replyTo.text": "🚫 Deleted",
        "replyTo.image": null
      })
    );

    batch.delete(doc(db, "chats", chatId, "messages", id));
    await batch.commit();
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 w-full overflow-hidden">
      {/* HEADER */}
      <header className="h-20 bg-white border-b flex items-center px-4 gap-3">
        <button onClick={() => navigate("/chat")}>
          <FaArrowLeft />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar src={otherUser?.photoURL} name={otherUser?.displayName} />
          <h3 className="font-bold">
            {otherUser?.displayName || "Loading..."}
          </h3>
        </div>
        <button onClick={() => setShowChatMenu(!showChatMenu)}>
          <FaEllipsisV />
        </button>
      </header>

      {/* MESSAGES */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onClick={() => setSelectedMsgId(null)}
      >
        {loadingMore && <FaSpinner className="animate-spin mx-auto" />}

        {messages.map(msg => {
          const isMe = msg.senderId === user.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] p-3 rounded-xl ${
                  isMe ? "bg-slate-900 text-white" : "bg-white border"
                }`}
                onClick={() =>
                  setSelectedMsgId(selectedMsgId === msg.id ? null : msg.id)
                }
              >
                {msg.image && (
                  <img src={msg.image} className="rounded mb-2" />
                )}
                <p>{msg.text}</p>
                <div className="text-xs mt-1 flex justify-end gap-1">
                  {isMe && (msg.read ? <FaCheckDouble /> : <FaCheck />)}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* INPUT */}
      <footer className="p-3 border-t bg-white flex gap-2">
        <button onClick={() => fileInputRef.current.click()}>
          <FaImage />
        </button>
        <input
          type="file"
          hidden
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
        />

        <textarea
          ref={textareaRef}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          className="flex-1 resize-none"
          placeholder="Type a message..."
        />

        <button onClick={sendMessage}>
          <FaPaperPlane />
        </button>
      </footer>

      {/* DELETE MODAL */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, msgId: null })}
        title="Delete Message"
      >
        <p>This will delete the message for everyone.</p>
        <button onClick={handleDeleteMessage}>Delete</button>
      </Modal>
    </div>
  );
}
