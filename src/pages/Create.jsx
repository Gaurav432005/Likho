import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { toast } from "react-hot-toast";
import {
  FaArrowLeft,
  FaSave,
  FaGlobeAmericas,
  FaLock,
  FaPaperPlane,
  FaTimes,
} from "react-icons/fa";

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const editData = location.state?.editData || null;
  const isEditMode = !!editData;
  const initialMode = isEditMode
    ? editData.isDiary === true
    : location.state?.mode === "diary";

  const [isDiaryMode, setIsDiaryMode] = useState(initialMode);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    if (isEditMode && editData) {
      setContent(editData.content || "");
      setIsDiaryMode(editData.isDiary === true);
    } else {
      const savedDraft = localStorage.getItem("likho_draft");
      if (savedDraft) setContent(savedDraft);
    }
  }, [isEditMode, editData]);

  useEffect(() => {
    if (!isEditMode) {
      localStorage.setItem("likho_draft", content);
    }
  }, [content, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    const toastId = toast.loading(isEditMode ? "Updating..." : "Publishing...");

    try {
      if (isEditMode && editData?.id) {
        const wasDiary = editData.isDiary === true;
        const isNowDiary = isDiaryMode === true;

        if (wasDiary !== isNowDiary) {
          const newCollectionName = isNowDiary ? "diary" : "posts";
          await addDoc(collection(db, newCollectionName), {
            ...editData,
            content,
            isDiary: isNowDiary,
            isEdited: true,
            timestamp: editData.timestamp || serverTimestamp(),
          });

          const oldCollectionName = wasDiary ? "diary" : "posts";
          await deleteDoc(doc(db, oldCollectionName, editData.id));

          toast.success(
            `Moved to ${isNowDiary ? "Diary" : "Public"}!`,
            { id: toastId }
          );
        } else {
          const collectionToUpdate = isNowDiary ? "diary" : "posts";
          await updateDoc(doc(db, collectionToUpdate, editData.id), {
            content,
            isEdited: true,
          });
          toast.success("Updated!", { id: toastId });
        }
      } else {
        const collectionName = isDiaryMode ? "diary" : "posts";
        await addDoc(collection(db, collectionName), {
          content,
          author: user.displayName || "Anonymous",
          userId: user.uid,
          photoURL: user.photoURL || null,
          timestamp: serverTimestamp(),
          isDiary: isDiaryMode,
        });

        toast.success(
          isDiaryMode ? "Saved to Secret Diary!" : "Published to World!",
          { id: toastId }
        );

        localStorage.removeItem("likho_draft");
      }

      navigate(isDiaryMode ? "/diary" : "/");
    } catch (error) {
      toast.error("Error: " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const shouldAutoFocus = window.innerWidth > 768;

  return (
    <div className="w-full h-full mx-auto flex flex-col animate-fade-in relative">

      {/* -------- SMALL CONFIRM POPUP -------- */}
      {showConfirmClear && (
        <div className="absolute top-20 right-6 z-50 bg-white shadow-xl border border-slate-200 rounded-xl p-4 w-52 animate-fade-in">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Clear this note?
          </p>

          <div className="flex justify-end gap-2">
            <button
              className="text-xs px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300"
              onClick={() => setShowConfirmClear(false)}
            >
              Cancel
            </button>

            <button
              className="text-xs px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                setContent("");
                setShowConfirmClear(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
      {/* ------------------------------------ */}

      <div className="flex items-center justify-between mb-6 px-2">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold text-sm transition-colors"
        >
          <FaArrowLeft /> Back
        </button>

        <div className="bg-slate-200 p-1 rounded-xl flex gap-1">
          <button
            type="button"
            onClick={() => setIsDiaryMode(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              !isDiaryMode
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FaGlobeAmericas size={12} /> Public
          </button>

          <button
            type="button"
            onClick={() => setIsDiaryMode(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isDiaryMode
                ? "bg-amber-100 shadow-sm text-amber-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FaLock size={12} /> Diary
          </button>
        </div>

        <div className="w-16"></div>
      </div>

      <div
        className={`flex-1 rounded-3xl shadow-xl border overflow-hidden relative flex flex-col transition-colors duration-500 ${
          isDiaryMode
            ? "bg-amber-50/50 border-amber-100"
            : "bg-white border-slate-200"
        }`}
      >
        <div
          className={`h-1.5 w-full bg-gradient-to-r ${
            isDiaryMode
              ? "from-amber-300 via-orange-300 to-amber-300"
              : "from-slate-500 via-gray-500 to-slate-500"
          }`}
        ></div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col p-6 md:p-8 relative"
        >
          {content.length > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmClear(true)}
              className="absolute top-5 right-5 text-slate-400 hover:text-red-500 transition text-xl z-40"
            >
              <FaTimes />
            </button>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isDiaryMode ? "Dear Diary..." : "What's happening?"}
            className={`flex-1 w-full text-m leading-relaxed outline-none resize-none placeholder:text-slate-300 font-medium bg-transparent ${
              isDiaryMode
                ? "text-amber-900 font-serif"
                : "text-slate-700"
            }`}
            autoFocus={shouldAutoFocus}
            maxLength={5000}
          />

          <div className="flex items-center justify-between pt-6 border-t border-slate-100/50 mt-4">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                content.length > 4500 ? "text-red-500" : "text-slate-400"
              }`}
            >
              {content.length}/5000
            </span>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={loading || !content.trim()}
                className={`px-8 shadow-lg ${
                  isDiaryMode
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                }`}
              >
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    {isDiaryMode ? <FaSave /> : <FaPaperPlane />}
                    {isDiaryMode ? " Save" : " Publish"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
