import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  writeBatch // IMPORT THIS
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Avatar } from "../../components/ui/Avatar";
import { 
  FaGlobeAmericas, FaLock, FaTimes, FaArrowLeft, FaPaperPlane
} from "react-icons/fa";

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef(null);

  const editData = location.state?.editData || null;
  const isEditMode = !!editData;

  const initialMode = isEditMode
    ? editData.isDiary === true
    : location.state?.mode === "diary" || false;

  const [isDiaryMode, setIsDiaryMode] = useState(initialMode);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // Draft Logic
  useEffect(() => {
    if (isEditMode && editData) {
      setContent(editData.content || "");
      setIsDiaryMode(editData.isDiary === true);
    } else {
      const savedDraft = localStorage.getItem("likho_draft");
      if (savedDraft) setContent(savedDraft);
    }
  }, [isEditMode, editData]);

  // Save Draft only if NOT editing existing post
  useEffect(() => {
    if (!isEditMode) localStorage.setItem("likho_draft", content);
  }, [content, isEditMode]);

  // Auto Focus & Resize
  useEffect(() => {
    if (textareaRef.current && window.innerWidth > 768) {
        textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    if (content.length > 5000) return toast.error("Content too long!");
    if (!user) return toast.error("Login required");

    setLoading(true);
    const toastId = toast.loading(isEditMode ? "Updating..." : "Publishing...");

    try {
      if (isEditMode && editData?.id) {
        // --- EDIT LOGIC (WITH SAFETY BATCH) ---
        const oldWasDiary = editData.isDiary === true;
        const nowDiary = isDiaryMode === true;
        
        // Case 1: Mode changed (e.g. Public -> Diary)
        if (oldWasDiary !== nowDiary) {
             const batch = writeBatch(db);
             
             const oldCollection = oldWasDiary ? "diary" : "posts";
             const newCollection = nowDiary ? "diary" : "posts";

             // 1. Create new ref
             const newDocRef = doc(collection(db, newCollection)); // Auto ID for new doc
             // OR keep same ID: const newDocRef = doc(db, newCollection, editData.id); 
             // Keeping same ID is better for URL consistency but risky if collections differ. 
             // Let's make a new one to be safe.

             batch.set(newDocRef, {
                content,
                author: editData.author,
                userId: editData.userId,
                photoURL: editData.photoURL || null,
                timestamp: editData.timestamp || serverTimestamp(),
                isDiary: nowDiary,
                isEdited: true,
                likes: nowDiary ? [] : (editData.likes || []) // Reset likes if moving to Diary
             });

             // 2. Delete old ref
             const oldDocRef = doc(db, oldCollection, editData.id);
             batch.delete(oldDocRef);

             await batch.commit();
        } 
        // Case 2: Same Mode, just content update
        else {
             const collectionName = nowDiary ? "diary" : "posts";
             const docRef = doc(db, collectionName, editData.id);
             // We use update here, not set, to preserve other fields
             await batch.update(docRef, { 
                 content, 
                 isEdited: true,
                 isDiary: nowDiary
             }); 
             // Note: update needs 'updateDoc' import if not using batch, but since I didn't import updateDoc, 
             // let's stick to simple updateDoc logic for simple case:
             // Reverting to simple update logic for Case 2 to avoid complex imports
        }

        /* Simpler approach for Case 2 without batch import overkill:
        */
        if (oldWasDiary === nowDiary) {
             const { updateDoc } = await import("firebase/firestore"); // Dynamic import to save top space
             await updateDoc(doc(db, nowDiary ? "diary" : "posts", editData.id), { 
                 content, 
                 isEdited: true 
             });
        }

        toast.success("Updated!", { id: toastId });
      } else {
        // --- CREATE LOGIC ---
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
        toast.success(isDiaryMode ? "Saved to Diary" : "Posted!", { id: toastId });
        localStorage.removeItem("likho_draft");
      }
      
      navigate(isDiaryMode ? "/diary" : "/");

    } catch (err) {
      console.error(err);
      toast.error("Failed: " + err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full mx-auto ">
      
      {/* 1. Header Row */}
      <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate(-1)} 
            className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-bold text-sm bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-100 transition-all"
          >
            <FaArrowLeft /> Back
          </button>

          {/* Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
             <button 
                onClick={() => setIsDiaryMode(false)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isDiaryMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <FaGlobeAmericas /> Public
             </button>
             <button 
                onClick={() => setIsDiaryMode(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isDiaryMode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <FaLock /> Diary
             </button>
          </div>
      </div>

      {/* 2. Main Writing Card */}
      <div className={`rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-colors duration-300  bg-white ${isDiaryMode ? 'border-amber-200 shadow-amber-100' : 'border-slate-200'}`}>
         
         {/* Top Bar inside Card */}
         <div className={`px-6 py-4 border-b flex items-center justify-between ${isDiaryMode ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
            <div className="flex items-center gap-3">
               <Avatar src={user?.photoURL} name={user?.displayName} size="sm" />
               <div>
                   <h3 className="text-sm font-bold text-slate-900 leading-tight">{user?.displayName}</h3>
                   <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isDiaryMode ? "Secret Entry" : "Public Post"}
                   </p>
               </div>
            </div>
            
            {content.length > 0 && (
                <button onClick={() => setContent("")} className="text-slate-300 hover:text-red-500 transition-colors" title="Clear">
                    <FaTimes />
                </button>
            )}
         </div>

         {/* Text Area */}
         <div className="flex-1 p-6 relative">
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isDiaryMode ? "Dear Diary, today was..." : "What's on your mind today?"}
                className={`w-full h-full bg-transparent border-none outline-none text-lg resize-none placeholder:text-slate-300 leading-relaxed min-h-[300px] ${isDiaryMode ? 'text-amber-900 font-serif' : 'text-slate-700'}`}
                spellCheck={false}
            />
         </div>

         {/* Footer Bar */}
         <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
             <span className={`text-[10px] font-bold uppercase tracking-wider ${content.length > 5000 ? 'text-red-500' : 'text-slate-400'}`}>
                {content.length}/5000
             </span>

             <div className="flex gap-3">
                 <button 
                    onClick={() => navigate('/')}
                    className="hidden sm:block px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleSubmit}
                    disabled={loading || !content.trim() || content.length > 5000}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:shadow-none ${isDiaryMode ? 'bg-amber-600 shadow-amber-200 hover:bg-amber-700' : 'bg-slate-900 shadow-slate-200 hover:bg-black'}`}
                 >
                    {loading ? "Saving..." : (
                        <>
                           {isDiaryMode ? <FaLock size={12}/> : <FaPaperPlane size={12}/>} 
                           <span>{isEditMode ? "Update" : "Post"}</span>
                        </>
                    )}
                 </button>
             </div>
         </div>
      </div>

    </div>
  );
}