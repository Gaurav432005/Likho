import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, writeBatch, limit } from "firebase/firestore";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { uploadToCloudinary } from "../../services/cloudinary";
import { PostCard } from "../feed/PostCard";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button"; 
import { FaEnvelope, FaPen, FaCamera, FaKey, FaSignOutAlt, FaSpinner } from "react-icons/fa";
import Masonry from "react-masonry-css";
import { toast } from "react-hot-toast";

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const isOwnProfile = user?.uid === userId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
            const data = userSnap.data();
            setProfile(data);
            setEditName(data.displayName);
            setEditBio(data.bio || "");
        }
        
        const q = query(collection(db, "posts"), where("userId", "==", userId), orderBy("timestamp", "desc"));
        const postSnaps = await getDocs(q);
        setPosts(postSnaps.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [userId]);

  // --- SYNC FUNCTIONS ---
  
  // 1. Posts Update
  const updatePastPostsPhoto = async (newPhotoURL) => {
      const q = query(collection(db, "posts"), where("userId", "==", user.uid), limit(400));
      const snapshot = await getDocs(q);
      if(snapshot.empty) return;
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { photoURL: newPhotoURL });
      });
      await batch.commit();
  };

  // 2. Chats Update (FIX: Ye missing tha pehle)
  const updateChatProfiles = async (newPhotoURL) => {
      const q = query(collection(db, "chats"), where("users", "array-contains", user.uid));
      const snapshot = await getDocs(q);
      if(snapshot.empty) return;
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
          // Update nested object field in Firestore
          batch.update(doc.ref, {
              [`participantDetails.${user.uid}.photoURL`]: newPhotoURL
          });
      });
      await batch.commit();
      console.log("Updated chats photo");
  };

  const handleUpdateProfile = async () => {
      if(!editName.trim()) return;
      const toastId = toast.loading("Saving...");
      try {
          if (auth.currentUser.uid === userId) {
              await updateProfile(auth.currentUser, { displayName: editName });
          }
          await updateDoc(doc(db, "users", userId), { displayName: editName, bio: editBio });
          setProfile(prev => ({ ...prev, displayName: editName, bio: editBio }));
          setIsEditing(false);
          toast.success("Profile Updated!", { id: toastId });
      } catch (err) { toast.error("Error updating", { id: toastId }); }
  };

  const handlePhotoUpload = async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      
      setUploading(true);
      const toastId = toast.loading("Uploading & Syncing...");
      
      try {
          const url = await uploadToCloudinary(file);
          
          await updateProfile(auth.currentUser, { photoURL: url });
          await updateDoc(doc(db, "users", userId), { photoURL: url });
          
          // Sync everywhere
          Promise.all([
              updatePastPostsPhoto(url),
              updateChatProfiles(url) // FIX Called here
          ]);

          setProfile(prev => ({ ...prev, photoURL: url }));
          toast.success("Photo Updated!", { id: toastId });
      } catch (err) { 
          console.error(err);
          toast.error("Upload failed", { id: toastId }); 
      }
      finally { setUploading(false); }
  };

  const handleChangePassword = async () => {
      if(!oldPass || !newPass) return toast.error("Fill all fields");
      const toastId = toast.loading("Updating password...");
      try {
          const cred = EmailAuthProvider.credential(user.email, oldPass);
          await reauthenticateWithCredential(auth.currentUser, cred);
          await updatePassword(auth.currentUser, newPass);
          toast.success("Password Changed!", { id: toastId });
          setShowPassModal(false);
          setOldPass(""); setNewPass("");
      } catch (err) { toast.error("Incorrect old password", { id: toastId }); }
  };

  const handleMessage = async () => {
      const q = query(collection(db, "chats"), where("users", "array-contains", user.uid));
      const snaps = await getDocs(q);
      let existingChat = null;
      snaps.forEach(doc => { 
          if (doc.data().users.includes(userId)) existingChat = doc.id; 
      });

      if (existingChat) {
          navigate(`/chat/${existingChat}`);
      } else {
          const newChat = await addDoc(collection(db, "chats"), {
              users: [user.uid, userId],
              participantDetails: {
                  [user.uid]: { name: user.displayName, photoURL: user.photoURL },
                  [userId]: { name: profile.displayName, photoURL: profile.photoURL }
              },
              lastMessage: "Started a conversation",
              lastMessageSenderId: user.uid,
              lastMessageTime: serverTimestamp(),
              receiverHasRead: false
          });
          navigate(`/chat/${newChat.id}`);
      }
  };

  if (loading) return <div className="h-full flex items-center justify-center text-slate-400 font-bold">Loading...</div>;
  if (!profile) return <div className="text-center py-20">User not found</div>;

  return (
    <div className="pb-24 mx-auto">
       {/* Profile Card */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8 relative">
           <div className="h-32 bg-slate-900 relative pattern-grid-lg opacity-90"></div>

           <div className="px-6 md:px-10 pb-8 flex flex-col md:flex-row gap-6 items-start -mt-12">
               {/* Avatar */}
               <div className="relative group shrink-0">
                   <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-white bg-white shadow-md overflow-hidden relative">
                        <img 
                            src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
                            className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-50' : ''}`}
                            alt="Profile"
                        />
                        {uploading && <div className="absolute inset-0 flex items-center justify-center"><FaSpinner className="animate-spin text-slate-900"/></div>}
                   </div>
                   
                   {isOwnProfile && !uploading && (
                       <div 
                           className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10" 
                           onClick={() => fileInputRef.current.click()}
                       >
                           <FaCamera className="text-white text-xl drop-shadow-md" />
                       </div>
                   )}
                   <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
               </div>

               {/* Info */}
               <div className="flex-1 w-full pt-2 md:pt-14">
                   {isEditing ? (
                       <div className="space-y-4 max-w-md animate-fade-in">
                           <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold" placeholder="Your Name" />
                           <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl resize-none" rows={3} placeholder="Tell us about yourself..." />
                           <div className="flex gap-3">
                               <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">Cancel</Button>
                               <Button onClick={handleUpdateProfile} size="sm"><FaPen /> Save Changes</Button>
                           </div>
                       </div>
                   ) : (
                       <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                           <div>
                               <h1 className="text-2xl font-bold text-slate-900">{profile.displayName}</h1>
                               <p className="text-slate-500 mt-2 leading-relaxed max-w-xl">{profile.bio || "No bio yet."}</p>
                           </div>
                           <div className="flex flex-wrap gap-2">
                               {isOwnProfile ? (
                                   <>
                                     <Button onClick={() => setIsEditing(true)} variant="secondary" className="h-10 px-4 text-xs"><FaPen className="mr-2"/> Edit Profile</Button>
                                     <Button onClick={() => setShowPassModal(true)} variant="secondary" className="h-10 w-10 p-0"><FaKey/></Button>
                                     <Button onClick={() => auth.signOut()} variant="danger" className="h-10 w-10 p-0"><FaSignOutAlt/></Button>
                                   </>
                               ) : (
                                   <Button onClick={handleMessage} className="gap-2 bg-indigo-600 text-white shadow-indigo-200">
                                       <FaEnvelope /> Send Message
                                   </Button>
                               )}
                           </div>
                       </div>
                   )}
               </div>
           </div>
       </div>

       <div className="mb-6 flex items-center justify-between px-2">
           <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               Posts <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-xs">{posts.length}</span>
           </h3>
       </div>

       {posts.length === 0 ? (
           <div className="text-center py-20 text-slate-400">No posts yet.</div>
       ) : (
           <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
               {posts.map(post => <PostCard key={post.id} note={post} />)}
           </Masonry>
       )}

       {/* Password Modal */}
       <Modal isOpen={showPassModal} onClose={() => setShowPassModal(false)} title="Change Password">
           <div className="space-y-4 pt-2">
               <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Old Password" class="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-500 transition-colors" />
               <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New Password" class="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-indigo-500 transition-colors" />
               <Button onClick={handleChangePassword} className="w-full mt-4 h-12">Update Password</Button>
           </div>
       </Modal>
    </div>
  );
}