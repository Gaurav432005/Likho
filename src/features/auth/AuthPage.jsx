import { useState, useEffect } from "react";
import { auth, db, googleProvider } from "../../lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

import { 
  FaBookOpen, 
  FaPenFancy, 
  FaGlobeAmericas, 
  FaShieldAlt, 
  FaUser,
  FaEnvelope,
  FaLock
} from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const trackUserLogin = async (uid, email) => {
    try {
        const res = await fetch('https://ipapi.co/json/');
        if(!res.ok) return;
        
        const data = await res.json();
        
        const userAgent = navigator.userAgent;
        let deviceType = "Desktop";
        if (/Mobi|Android/i.test(userAgent)) deviceType = "Mobile";
        else if (/iPad|Tablet/i.test(userAgent)) deviceType = "Tablet";
        
        await addDoc(collection(db, "users", uid, "loginHistory"), {
            ip: data.ip || "Unknown",
            location: `${data.city || ''}, ${data.region || ''}, ${data.country_name || ''}`,
            coordinates: `${data.latitude || ''}, ${data.longitude || ''}`,
            isp: data.org || "Unknown ISP",
            timezone: data.timezone || "Unknown",
            device: deviceType,
            browser: userAgent,
            timestamp: serverTimestamp(),
            email: email
        });
    } catch (error) {
        // Silent fail
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
    }
    if (!isLogin && name.trim().length === 0) {
        toast.error("Please enter your name");
        return;
    }

    setLoading(true);

    try {
      let uid;
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        toast.success("Welcome back!");
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        uid = res.user.uid;
        
        await updateProfile(res.user, { displayName: name });
        await setDoc(doc(db, "users", uid), {
          displayName: name,
          email,
          photoURL: null,
          createdAt: new Date()
        });

        toast.success("Account created successfully!");
      }
      
      trackUserLogin(uid, email);
      
    } catch (err) {
      console.error(err);
      const errMsg = err.message.replace("Firebase:", "").replace("auth/", "").trim();
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const usr = result.user;
      
      const docRef = doc(db, "users", usr.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          displayName: usr.displayName,
          email: usr.email,
          photoURL: usr.photoURL,
          createdAt: new Date()
        });
        toast.success("Account created with Google!");
      } else {
        toast.success("Welcome back!");
      }
      
      trackUserLogin(usr.uid, usr.email);

    } catch (err) {
      console.error(err);
      toast.error("Google Login Failed");
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-gray-50 to-white flex flex-col font-sans">

      <header className="flex items-center justify-between px-6 md:px-16 h-20 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
            <FaBookOpen className="text-lg" />
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">Likho</span>
        </div>
        <span className=" md:block text-sm font-semibold text-slate-500">Made with 💕 by Gaurav</span>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 md:px-6 py-10 lg:py-0 overflow-y-auto">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          <div className="hidden lg:flex flex-col justify-center space-y-6 pr-6">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
              Share Your <span className="text-slate-800">Valuable</span> Thoughts
            </h1>
            <p className="text-lg text-slate-600">
              Join Likho 2.0. A safe space to share your daily stories, public ideas, and private diary entries.
            </p>
            <div className="space-y-4 mt-4">
                <FeatureItem icon={<FaPenFancy className="text-indigo-600" />} title="Write Freely" desc="Express anything without limits" />
                <FeatureItem icon={<FaGlobeAmericas className="text-emerald-600" />} title="Share Globally" desc="Connect with a worldwide community" />
                <FeatureItem icon={<FaShieldAlt className="text-amber-600" />} title="Secret Diary" desc="Keep your personal thoughts private" />
            </div>
          </div>

          <div className="w-full max-w-md mx-auto bg-white border border-gray-200 p-8 rounded-3xl shadow-xl">
            <h2 className="text-3xl font-bold text-center text-slate-900">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-center text-slate-500 mt-1">
              {isLogin ? "Login to continue" : "Sign up and start writing"}
            </p>

            <form onSubmit={handleAuth} className="mt-6 space-y-4">
              {!isLogin && (
                <div className="relative group">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-slate-800 font-semibold outline-none focus:border-slate-900 focus:bg-white transition-all"
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="relative group">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-slate-800 font-semibold outline-none focus:border-slate-900 focus:bg-white transition-all"
                    autoComplete="email"
                  />
              </div>

              <div className="relative group">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-slate-800 font-semibold outline-none focus:border-slate-900 focus:bg-white transition-all"
                    autoComplete="current-password"
                  />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl text-lg font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : isLogin ? "Log In" : "Create Account"}
              </button>
            </form>

            <div className="my-6 flex items-center">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-gray-400 text-xs px-2 font-medium uppercase">Or continue with</span>
                <div className="h-px bg-gray-200 flex-1" />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white border-2 border-gray-200 rounded-2xl font-bold text-slate-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <FcGoogle size={22} />
              Google
            </button>

            <p className="text-center text-sm mt-6 text-slate-600">
              {isLogin ? "New here?" : "Already a member?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-slate-900 font-bold hover:underline"
              >
                {isLogin ? "Create Account" : "Log In"}
              </button>
            </p>
          </div>
        </div>
      </main>
      
      <footer className="flex-none py-4 text-center text-gray-400 text-xs bg-gray-50">
        © {new Date().getFullYear()} Likho. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureItem({ icon, title, desc }) {
  return (
    <div className="flex items-center gap-4 p-2">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-800">{title}</h3>
        <p className="text-slate-500 text-sm">{desc}</p>
      </div>
    </div>
  );
}
