import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  updateDoc,
  writeBatch,
  limit,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { uploadToCloudinary } from "../../services/cloudinary";
import { PostCard } from "../feed/PostCard";
import { Button } from "../../components/ui/Button";
import { Loading } from "../../components/ui/Loading";
import {
  FaEnvelope,
  FaPen,
  FaCamera,
  FaSignOutAlt,
  FaSpinner,
  FaTimes,
  FaSave,
  FaTrash,
  FaArrowLeft
} from "react-icons/fa";
import Masonry from "react-masonry-css";
import { toast } from "react-hot-toast";

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth(); // Current Logged in User
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Derived State
  const isOwnProfile = user?.uid === userId;

  useEffect(() => {
    // Agar userId hi nahi hai to return (Safety)
    if(!userId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch User Profile
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setProfile(data);
          setEditName(data.displayName || "");
          setEditBio(data.bio || "");
        } else {
            setProfile(null);
        }

        // 2. Fetch User's Posts
        const q = query(
          collection(db, "posts"),
          where("userId", "==", userId),
          orderBy("timestamp", "desc")
        );
        const postSnaps = await getDocs(q);
        setPosts(postSnaps.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Profile Fetch Error:", err);
        toast.error("Error loading profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  /* ------------------ HELPERS (Batch Updates) ------------------ */
  
  // Note: Production me ye kaam Backend (Cloud Functions) se hona chahiye
  const updatePastPostsPhoto = async (newPhotoURL) => {
    try {
        const q = query(
            collection(db, "posts"),
            where("userId", "==", user.uid),
            limit(450) // Firestore batch limit is 500
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) =>
            batch.update(doc.ref, { photoURL: newPhotoURL })
        );
        await batch.commit();
        console.log("Past posts updated");
    } catch (e) {
        console.error("Failed to update past posts", e);
    }
  };

  const updateChatProfiles = async (newPhotoURL) => {
    try {
        const q = query(
            collection(db, "chats"),
            where("users", "array-contains", user.uid)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) =>
            batch.update(doc.ref, {
                [`participantDetails.${user.uid}.photoURL`]: newPhotoURL,
            })
        );
        await batch.commit();
    } catch (e) {
        console.error("Failed to update chats", e);
    }
  };

  /* ------------------ ACTIONS ------------------ */

  const handleUpdateProfile = async () => {
    if (!editName.trim()) return toast.error("Name cannot be empty");
    
    setSaving(true);
    const toastId = toast.loading("Saving profile...");
    
    try {
      await updateProfile(auth.currentUser, { displayName: editName });
      
      await updateDoc(doc(db, "users", userId), {
        displayName: editName,
        bio: editBio,
      });

      setProfile((p) => ({ ...p, displayName: editName, bio: editBio }));
      setIsEditing(false);
      toast.success("Profile updated", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Update failed", { id: toastId });
    } finally {
        setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading photo...");
    
    try {
      const url = await uploadToCloudinary(file);
      
      // 1. Update Auth
      await updateProfile(auth.currentUser, { photoURL: url });
      
      // 2. Update Firestore User Doc
      await updateDoc(doc(db, "users", userId), { photoURL: url });

      // 3. Background updates (Await here to ensure consistency, but wrap in try-catch above)
      await Promise.all([
        updatePastPostsPhoto(url),
        updateChatProfiles(url),
      ]);

      setProfile((p) => ({ ...p, photoURL: url }));
      toast.success("Photo updated", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm("Remove profile photo?")) return;
    const toastId = toast.loading("Removing photo...");
    try {
      await updateProfile(auth.currentUser, { photoURL: "" });
      await updateDoc(doc(db, "users", userId), { photoURL: null });

      await Promise.all([
        updatePastPostsPhoto(null),
        updateChatProfiles(null),
      ]);

      setProfile((p) => ({ ...p, photoURL: null }));
      toast.success("Photo removed", { id: toastId });
    } catch {
      toast.error("Failed", { id: toastId });
    }
  };

  const handleMessage = async () => {
    if (!user) return toast.error("Please login to message");
    
    const toastId = toast.loading("Opening chat...");
    try {
        // Query to find existing chat
        const q = query(
            collection(db, "chats"),
            where("users", "array-contains", user.uid)
        );
        const snaps = await getDocs(q);
        let existingChatId = null;

        // Filter locally (Firestore workaround for array-contains-any logic)
        snaps.forEach((d) => {
            const data = d.data();
            if (data.users.includes(userId)) existingChatId = d.id;
        });

        if (existingChatId) {
            toast.dismiss(toastId);
            navigate(`/chat/${existingChatId}`);
        } else {
            // Create New Chat
            const chat = await addDoc(collection(db, "chats"), {
                users: [user.uid, userId],
                participantDetails: {
                    [user.uid]: {
                        name: user.displayName,
                        photoURL: user.photoURL,
                    },
                    [userId]: {
                        name: profile.displayName,
                        photoURL: profile.photoURL,
                    },
                },
                lastMessage: "Started conversation",
                lastMessageSenderId: user.uid,
                lastMessageTime: serverTimestamp(),
                createdAt: serverTimestamp()
            });
            toast.dismiss(toastId);
            navigate(`/chat/${chat.id}`);
        }
    } catch (err) {
        console.error(err);
        toast.error("Could not start chat", { id: toastId });
    }
  };

  /* ------------------ UI ------------------ */

  if (loading) return <Loading message="Loading profile..." />;
  
  if (!profile) return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <p className="text-xl font-bold text-slate-400">User not found</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
  );

  return (
    <div className="pb-24 min-h-full bg-slate-50">


      <div className=" mx-auto">
        {/* PROFILE CARD */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
          
          {/* AVATAR SECTION */}
          <div className="relative group shrink-0 mx-auto md:mx-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center relative">
              <img
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=random`}
                alt={profile.displayName}
                className={`w-full h-full object-cover transition-opacity ${uploading ? "opacity-50" : "opacity-100"}`}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <FaSpinner className="animate-spin text-white text-2xl" />
                </div>
              )}
            </div>

            {/* Edit Photo Buttons */}
            {isOwnProfile && isEditing && !uploading && (
              <div className="absolute -bottom-2 -right-2 flex gap-2">
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="bg-slate-900 text-white p-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
                  title="Change Photo"
                >
                  <FaCamera size={14} />
                </button>
                {profile.photoURL && (
                  <button
                    onClick={handlePhotoDelete}
                    className="bg-red-500 text-white p-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
                    title="Remove Photo"
                  >
                    <FaTrash size={14} />
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* INFO SECTION */}
          <div className="flex-1 w-full">
            {isEditing ? (
              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 space-y-4 animate-fade-in">
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Display Name</label>
                    <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-lg font-bold p-3 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        placeholder="Your Name"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Bio</label>
                    <textarea
                        rows={3}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                    />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProfile} disabled={saving}>
                    {saving ? <FaSpinner className="animate-spin"/> : <FaSave />} Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-extrabold text-slate-900">
                  {profile.displayName}
                </h1>
                <p className="text-slate-500 mt-3 whitespace-pre-wrap text-base leading-relaxed max-w-xl">
                  {profile.bio || "No bio added yet."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                  {isOwnProfile ? (
                    <>
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-slate-900 text-white shadow-lg shadow-slate-200"
                      >
                        <FaPen size={12} /> Edit Profile
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => auth.signOut()}
                        className="gap-2"
                      >
                        <FaSignOutAlt /> Logout
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleMessage} className="gap-2 shadow-lg shadow-indigo-200">
                      <FaEnvelope /> Message
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* POSTS GRID */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
             <h3 className="font-bold text-xl text-slate-900">Posts</h3>
             <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">{posts.length}</span>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No posts yet</p>
            </div>
          ) : (
            <Masonry
              breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
              className="flex -ml-6 w-auto"
              columnClassName="pl-6 bg-clip-padding"
            >
              {posts.map((post) => (
                <div key={post.id} className="mb-6">
                    <PostCard
                    note={post}
                    // Optimistic Delete for Profile View
                    onDelete={() => setPosts((p) => p.filter((x) => x.id !== post.id))}
                    />
                </div>
              ))}
            </Masonry>
          )}
        </div>
      </div>
    </div>
  );
}