import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { FaGlobeAmericas, FaLock, FaTimes, FaArrowLeft, FaPaperPlane } from "react-icons/fa";

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef(null);

  const editData = location.state?.editData || null;
  const isEditMode = !!editData;
  const initialMode = isEditMode ? editData.isDiary === true : location.state?.mode === "diary" || false;

  const [isDiaryMode, setIsDiaryMode] = useState(initialMode);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // Load edit data or draft
  useEffect(() => {
    if (isEditMode && editData) {
      setContent(editData.content || "");
      setIsDiaryMode(editData.isDiary === true);
    } else {
      const savedDraft = localStorage.getItem("likho_draft");
      if (savedDraft) setContent(savedDraft);
    }
  }, [isEditMode, editData]);

  // Auto-save draft
  useEffect(() => {
    if (!isEditMode && content) {
      localStorage.setItem("likho_draft", content);
    }
  }, [content, isEditMode]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Write something!");
      return;
    }
    if (content.length > 5000) {
      toast.error("Too long! Max 5000 characters");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isEditMode ? "Updating..." : "Publishing...");

    try {
      if (isEditMode && editData?.id) {
        // Update existing post
        const collectionName = isDiaryMode ? "diary" : "posts";
        await updateDoc(doc(db, collectionName, editData.id), {
          content,
          isDiary: isDiaryMode,
          isEdited: true
        });
        toast.success("Updated!", { id: toastId });
      } else {
        // Create new post
        await addDoc(collection(db, isDiaryMode ? "diary" : "posts"), {
          content,
          author: user.displayName || "Anonymous",
          userId: user.uid,
          photoURL: user.photoURL || null,
          timestamp: serverTimestamp(),
          isDiary: isDiaryMode,
          likes: [],
          commentCount: 0
        });
        toast.success(isDiaryMode ? "Saved to diary!" : "Posted!", { id: toastId });
        localStorage.removeItem("likho_draft");
        setContent("");
      }

      navigate(isDiaryMode ? "/diary" : "/");
    } catch (err) {
      console.error(err);
      toast.error("Failed to post", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-slate-600 hover:text-slate-900 flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <FaArrowLeft /> Back
        </button>

        {/* Mode Toggle */}
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
          <button 
            onClick={() => setIsDiaryMode(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              !isDiaryMode 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FaGlobeAmericas /> Public
          </button>
          <button 
            onClick={() => setIsDiaryMode(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              isDiaryMode 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FaLock /> Diary
          </button>
        </div>
      </div>

      {/* Writing Card */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={user?.photoURL} name={user?.displayName} size="sm" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{user?.displayName}</h3>
              <p className="text-xs text-slate-500 font-semibold">{isDiaryMode ? "Private Entry" : "Public Post"}</p>
            </div>
          </div>
          
          {content.length > 0 && (
            <button 
              onClick={() => setContent("")} 
              className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg" 
              title="Clear"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isDiaryMode ? "Dear diary, today..." : "What's on your mind?"}
          className="flex-1 p-6 bg-white border-none outline-none text-lg resize-none placeholder:text-slate-300 leading-relaxed"
          spellCheck={false}
        />

        {/* Footer Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className={`text-xs font-bold ${
            content.length > 5000 
              ? 'text-red-500' 
              : content.length > 4000 
                ? 'text-orange-500' 
                : 'text-slate-400'
          }`}>
            {content.length}/5000
          </span>

          <div className="flex gap-3">
            <Button 
              onClick={() => navigate(-1)}
              variant="ghost"
              className="hidden sm:flex"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !content.trim() || content.length > 5000}
            >
              {loading ? "Posting..." : (
                <>
                  {isDiaryMode ? <FaLock /> : <FaPaperPlane />} 
                  {isEditMode ? "Update" : "Post"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
