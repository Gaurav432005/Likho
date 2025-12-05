import { useState, useRef, useEffect } from "react";
import { doc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore"; 
import { updateProfile } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { db, auth } from "../lib/firebase"; 
import { Button } from "../components/ui/Button";
import { toast } from "react-hot-toast";
import { IoIosSettings } from "react-icons/io";

export default function Settings() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setPhotoURL(user.photoURL || "");
    }
  }, [user]);

  // BASE 64 CONVERTER
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    e.target.value = ""; 
    
    // Strict Size Limit for Base64 (500KB)
    if (file.size > 500 * 1024) { 
        toast.error("Please choose a smaller image (Max 500KB)");
        return;
    }

    setProcessing(true);
    const toastId = toast.loading("Processing image...");

    try {
        const base64Image = await convertToBase64(file);
        setPhotoURL(base64Image);
        toast.success("Image ready to save!", { id: toastId });
    } catch (error) {
        console.error(error);
        toast.error("Failed to process image", { id: toastId });
    } finally {
        setProcessing(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Updating profile ...");

    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName,
        photoURL: photoURL 
      });

      // Update User Doc
      await setDoc(doc(db, "users", user.uid), { 
        displayName, 
        photoURL: photoURL || null,
        email: user.email,
        updatedAt: new Date()
      }, { merge: true });

      // Sync Public Posts (Batch Update)
      // Note: We don't need to sync 'Diary' entries because they are private 
      // and we display current user data anyway.
      const q = query(collection(db, "posts"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((document) => {
        const noteRef = doc(db, "posts", document.id);
        batch.update(noteRef, { 
            author: displayName,
            photoURL: photoURL
        });
      });

      await batch.commit();

      toast.success("Profile Updated!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full  mx-auto pt-2 animate-fade-in">
       
       <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
         <form onSubmit={handleSave} className="p-8 flex flex-col gap-8">
            
            <div className="flex flex-col items-center gap-4 py-4">
               <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                 {photoURL ? (
                    <img 
                        src={photoURL} 
                        className={`w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-lg transition-opacity ${processing ? 'opacity-50 blur-sm' : ''}`} 
                        alt="Avatar" 
                    />
                 ) : (
                    <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </div>
                 )}
                 <div className="absolute inset-0 bg-slate-900/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                      <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 </div>
               </div>
               <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">Profile Photo</p>
                    <p className="text-xs text-slate-400">Max 500KB</p>
               </div>
               <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
            </div>

            <div className="space-y-4">
               <div>
                   <label htmlFor="displayName" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Display Name</label>
                   <input 
                      id="displayName"
                      type="text" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-slate-900 focus:bg-white outline-none transition-all font-bold text-slate-800" 
                      placeholder="Your name" 
                   />
               </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-5 justify-between items-center">
                <button type="button" onClick={() => auth.signOut()} className="text-red-600 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">
                    Log Out
                </button>
                <Button type="submit" disabled={loading || processing} className="px-8 py-3 text-base shadow-xl shadow-slate-300">
                    {loading ? "Saving..." : "Save Changes"}
                </Button>
            </div>
         </form>
       </div>
    </div>
  );
}