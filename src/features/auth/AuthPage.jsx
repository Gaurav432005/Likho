import { useState, useEffect } from "react";
import { auth, db, googleProvider } from "../../lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

import { 
  FaFeatherAlt, 
  FaPenFancy, 
  FaGlobeAmericas, 
  FaShieldAlt, 
  FaUser,
  FaEnvelope,
  FaLock,
  FaPaperPlane,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheck
} from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // "login" | "signup" | "forgot"
  const [authMode, setAuthMode] = useState("login"); 
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState(""); 

  // --- FIXED: UseEffect Logic ---
  // Ye sirf tab chalega jab user pehle se logged in ho (Page Refresh case)
  // handleAuth wala navigation alag handle hoga taaki clash na ho.
  useEffect(() => {
    if (user && !loading) {
        // Legacy Check duplicate karne ki zarurat nahi, 
        // agar user context me hai, matlab wo valid hai.
        // Bas verification status check karlo.
        if(user.emailVerified) {
             navigate("/", { replace: true });
        }
    }
  }, [user, navigate, loading]);

  const trackUserLogin = async (uid, email) => {
    try {
        const res = await fetch('https://ipapi.co/json/');
        // Agar ad-blocker ne roka ya API down hai, to yahi ruk jao
        if(!res.ok) return; 
        
        const data = await res.json();
        const userAgent = navigator.userAgent;
        let deviceType = "Desktop";
        if (/Mobi|Android/i.test(userAgent)) deviceType = "Mobile";
        else if (/iPad|Tablet/i.test(userAgent)) deviceType = "Tablet";
        
        await addDoc(collection(db, "users", uid, "loginHistory"), {
            ip: data.ip || "Unknown",
            location: `${data.city || ''}, ${data.region || ''}, ${data.country_name || ''}`,
            device: deviceType,
            timestamp: serverTimestamp(),
            email: email
        });
    } catch (error) { 
        // Silent fail is okay here, UX kharab nahi hona chahiye
        console.log("Tracking skipped:", error.message); 
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    // 1. Forgot Password Flow
    if (authMode === "forgot") {
        if (!email) return toast.error("Please enter your email");
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success("Reset link sent! Check your email.");
            setAuthMode("login");
        } catch (err) {
            toast.error(err.message.replace("Firebase:", "").replace("auth/", ""));
        } finally {
            setLoading(false);
        }
        return;
    }

    // 2. Signup Validations
    if (authMode === "signup") {
        if (password.length < 6) return toast.error("Password must be at least 6 characters");
        if (password !== confirmPass) return toast.error("Passwords do not match!"); 
        if (name.trim().length === 0) return toast.error("Please enter your name");
    }

    setLoading(true);

    try {
      let userCredential;
      
      if (authMode === "login") {
        // --- LOGIN FLOW ---
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        const loggedUser = userCredential.user;

        // --- FIXED: Legacy & Verification Check ---
        const LEGACY_CUTOFF_DATE = new Date('2026-01-10'); 
        const userCreationTime = new Date(loggedUser.metadata.creationTime);

        // Logic: Naya user + Not Verified = BLOCK
        if (userCreationTime > LEGACY_CUTOFF_DATE && !loggedUser.emailVerified) {
             // CRITICAL FIX: Logout immediately to close loophole
             await signOut(auth);
             
             toast.error("Email not verified yet!");
             setVerificationSent(true);
             setLoading(false);
             return; // Stop execution here
        }

        toast.success("Welcome back!");
        
        // FIXED: Await tracking so component doesn't unmount before fetch completes
        await trackUserLogin(loggedUser.uid, email);
        
        // Manual navigation
        navigate("/", { replace: true });

      } else {
        // --- SIGNUP FLOW ---
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        await updateProfile(newUser, { displayName: name });
        await setDoc(doc(db, "users", newUser.uid), {
          displayName: name,
          email,
          photoURL: null,
          createdAt: new Date()
        });

        await sendEmailVerification(newUser);
        // Important: Signup ke baad bhi logout kar do taaki wo verify kiye bina ghus na paaye
        await signOut(auth);
        
        setVerificationSent(true);
        toast.success("Account created! Verification email sent.");
      }
      
    } catch (err) {
      console.error(err);
      const errMsg = err.message.replace("Firebase:", "").replace("auth/", "").trim();
      toast.error(errMsg);
    } finally {
      // Agar verify screen dikha rahe hain to loading false karo, 
      // warna navigation hone wala hai to loading true rehne do (flicker avoid karne ke liye)
      if (verificationSent || authMode === "signup" || authMode === "forgot") {
          setLoading(false);
      }
    }
  };

  const handleResendEmail = async () => {
      // Note: User signout ho chuka hai, isliye currentUser null ho sakta hai.
      // Is case me user ko login karke hi resend karna padega.
      // Lekin UX simplify karne ke liye hum user se kehte hain login karein.
      toast.error("Please login again to resend verification.");
      setVerificationSent(false);
      setAuthMode("login");
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
      
      // FIXED: Await tracking here too
      await trackUserLogin(usr.uid, usr.email);
      navigate("/", { replace: true });

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
            <FaFeatherAlt className="text-lg" />
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">Likho</span>
        </div>
        <span className="hidden md:block text-sm font-semibold text-slate-500">Made with ❤️ by Gaurav</span>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 md:px-6 py-10 lg:py-0 ">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* Left Side (Features) */}
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

          {/* Right Side (Form) */}
          <div className="w-full max-w-md mx-auto bg-white border border-gray-200 p-8 rounded-3xl shadow-xl">
            
            {/* --- VERIFICATION SCREEN --- */}
            {verificationSent ? (
                  <div className="text-center animate-fade-in">
                     <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                         <FaPaperPlane size={24} />
                     </div>
                     <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify your Email</h2>
                     <p className="text-slate-500 text-sm mb-4">
                         We sent a verification link to <br/>
                         <span className="font-bold text-slate-800">{email}</span>
                     </p>
                     <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl mb-6 flex items-start gap-3 text-left">
                         <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5" />
                         <p className="text-xs text-amber-800 font-medium">Check <b>Spam/Junk</b> folder if not found. Then login again.</p>
                     </div>
                     <div className="space-y-3">
                          <button onClick={() => { setVerificationSent(false); setAuthMode("login"); }} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all">Go to Login</button>
                     </div>
                     <button onClick={() => { setVerificationSent(false); setAuthMode("login"); }} className="mt-6 text-sm text-slate-400 font-bold hover:text-slate-600 flex items-center justify-center gap-2 mx-auto">
                         <FaArrowLeft /> Back
                     </button>
                  </div>
            ) : (
                /* --- AUTH FORMS --- */
                <>
                    <h2 className="text-3xl font-bold text-center text-slate-900">
                    {authMode === "login" ? "Welcome Back" : authMode === "signup" ? "Create Account" : "Reset Password"}
                    </h2>
                    <p className="text-center text-slate-500 mt-1 mb-6">
                    {authMode === "login" ? "Login to continue" : authMode === "signup" ? "Sign up and start writing" : "Enter email to get reset link"}
                    </p>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {/* Name - Signup Only */}
                        {authMode === "signup" && (
                            <div className="relative group">
                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <input
                                type="text" placeholder="Full Name" required={authMode === "signup"}
                                value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-slate-800 font-semibold outline-none focus:border-slate-900 focus:bg-white transition-all"
                            />
                            </div>
                        )}

                        {/* Email - All Modes */}
                        <div className="relative group">
                            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <input
                                type="email" placeholder="Email Address" required
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-slate-800 font-semibold outline-none focus:border-slate-900 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Password - Login & Signup Only */}
                        {authMode !== "forgot" && (
                            <div className="relative group">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="password" placeholder="Password" required
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-slate-800 font-semibold outline-none focus:border-slate-900 focus:bg-white transition-all"
                                />
                            </div>
                        )}

                        {/* Confirm Password - Signup Only */}
                        {authMode === "signup" && (
                            <div className="relative group">
                                <FaCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="password" placeholder="Confirm Password" required
                                    value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-slate-800 font-semibold outline-none focus:border-slate-900 focus:bg-white transition-all"
                                />
                            </div>
                        )}

                        {/* Forgot Password Link - Login Only */}
                        {authMode === "login" && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => setAuthMode("forgot")} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-slate-900 text-white rounded-2xl text-lg font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? "Processing..." : authMode === "login" ? "Log In" : authMode === "signup" ? "Create Account" : "Send Reset Link"}
                        </button>
                    </form>

                    {authMode !== "forgot" && (
                        <>
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
                        </>
                    )}

                    <div className="text-center text-sm mt-6 text-slate-600">
                        {authMode === "login" ? (
                            <>
                                New here? <button onClick={() => setAuthMode("signup")} className="text-slate-900 font-bold hover:underline">Create Account</button>
                            </>
                        ) : authMode === "signup" ? (
                            <>
                                Already a member? <button onClick={() => setAuthMode("login")} className="text-slate-900 font-bold hover:underline">Log In</button>
                            </>
                        ) : (
                            <button onClick={() => setAuthMode("login")} className="text-slate-900 font-bold hover:underline flex items-center justify-center gap-2 w-full">
                                <FaArrowLeft /> Back to Login
                            </button>
                        )}
                    </div>
                </>
            )}

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