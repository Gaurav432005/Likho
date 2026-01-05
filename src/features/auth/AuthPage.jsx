import { useState, useEffect, useRef } from "react";
import { auth, db, googleProvider } from "../../lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup, 
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

import { 
  FaFeatherAlt, FaPenFancy, FaGlobeAmericas, FaShieldAlt, 
  FaUser, FaEnvelope, FaLock, FaPaperPlane, FaArrowLeft, 
  FaCheck, FaRedo, FaSpinner
} from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  const [viewState, setViewState] = useState("login"); 
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  // Validation helpers
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateSignup = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Name is required";
    if (!email) errors.email = "Email is required";
    else if (!validateEmail(email)) errors.email = "Invalid email format";
    if (!password) errors.password = "Password is required";
    else if (!validatePassword(password)) errors.password = "Password must be at least 6 characters";
    if (password !== confirmPass) errors.confirmPass = "Passwords do not match";
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper to sync user to DB (Only call this AFTER verification)
  const syncUserToFirestore = async (userAuth, additionalData = {}) => {
    if (!userAuth) return;
    try {
      const userRef = doc(db, "users", userAuth.uid);
      await setDoc(userRef, {
        uid: userAuth.uid,
        email: userAuth.email,
        displayName: userAuth.displayName || additionalData.displayName || "User",
        photoURL: userAuth.photoURL || null,
        lastLoginAt: serverTimestamp(),
        ...additionalData
      }, { merge: true });
    } catch (error) {
      console.error("Profile sync error", error);
    }
  };

  const clearAllIntervals = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, []);

  // 1. Redirect Logic
  useEffect(() => {
    if (!authLoading && user) {
       const isGoogle = user.providerData.some(p => p.providerId === "google.com");
       
       if (user.emailVerified || isGoogle) {
           navigate("/", { replace: true });
       } else {
           setViewState("verify");
       }
    }
  }, [user, authLoading, navigate]);

  // 2. Auto-Poll for Verification (with timeout and retry limit)
  useEffect(() => {
    if (viewState === "verify" && user && !user.emailVerified) {
        const maxAttempts = 200; // ~10 minutes with 3s interval
        setPollAttempts(0);
        
        pollRef.current = setInterval(async () => {
            try {
                // Use auth.currentUser to get fresh user state
                const currentUser = auth.currentUser;
                if (!currentUser) return;
                
                await reload(currentUser);
                
                if (currentUser.emailVerified) {
                    await syncUserToFirestore(currentUser); 
                    toast.success("Account Verified Successfully!");
                    clearInterval(pollRef.current);
                    navigate("/", { replace: true });
                } else {
                    setPollAttempts(prev => prev + 1);
                    // Stop polling after max attempts
                    if (prev + 1 >= maxAttempts) {
                        clearInterval(pollRef.current);
                        toast.error("Verification timeout. Please resend the email.");
                    }
                }
            } catch (err) {
               console.error("Verification poll error:", err);
            }
        }, 3000);
    }
    return () => {
        if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [viewState, user, navigate]);

  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found': return "No account found with this email.";
      case 'auth/wrong-password': return "Incorrect password.";
      case 'auth/email-already-in-use': return "Email already registered. Try login.";
      case 'auth/invalid-email': return "Invalid email address.";
      case 'auth/weak-password': return "Password too short (min 6 chars).";
      case 'auth/too-many-requests': return "Too many attempts. Wait a moment.";
      case 'auth/popup-closed-by-user': return "Sign in cancelled.";
      case 'custom/mismatch': return "Passwords do not match.";
      default: return "Something went wrong. Try again.";
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    try {
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
            toast.success("Verification email resent!");
            setResendCooldown(60);
            timerRef.current = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    } catch (err) {
        toast.error("Wait before resending again.");
    }
  };

  const handleManualCheck = async () => {
      setLoading(true);
      try {
          const currentUser = auth.currentUser;
          if (!currentUser) {
              toast.error("Session expired. Please sign up again.");
              setLoading(false);
              return;
          }
          
          await reload(currentUser);
          if (currentUser.emailVerified) {
              await syncUserToFirestore(currentUser);
              toast.success("Verified! Redirecting...");
              navigate("/", { replace: true });
          } else {
              toast.error("Still not verified. Check your spam folder.");
          }
      } catch (e) {
          console.error("Manual verification check error:", e);
          toast.error("Error checking verification status. Try again.");
      } finally {
          setLoading(false);
      }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);

    try {
      if (viewState === "forgot") {
          if (!email) {
            setValidationErrors({ email: "Email is required" });
            setLoading(false);
            return;
          }
          if (!validateEmail(email)) {
            setValidationErrors({ email: "Invalid email format" });
            setLoading(false);
            return;
          }
          
          await sendPasswordResetEmail(auth, email);
          toast.success("Password reset link sent to your email!");
          setViewState("reset-sent"); 
          return;
      }

      if (viewState === "signup") {
          // Client-side validation first
          if (!validateSignup()) {
              setLoading(false);
              return;
          }

          // 1. Firebase Auth User create (Technical necessity for sending email)
          const res = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = res.user;

          // 2. Set display name
          await updateProfile(newUser, { displayName: name });

          // 3. Send verification email
          await sendEmailVerification(newUser);
          
          // Reset form and switch to verify view
          toast.success("Verification link sent to your email!");
          setEmail("");
          setPassword("");
          setConfirmPass("");
          setViewState("verify");
          setPollAttempts(0);
          return;
      }

      if (viewState === "login") {
          if (!email || !password) {
            const errors = {};
            if (!email) errors.email = "Email is required";
            if (!password) errors.password = "Password is required";
            setValidationErrors(errors);
            setLoading(false);
            return;
          }
          
          const res = await signInWithEmailAndPassword(auth, email, password);
          
          // Check if email is verified
          if (!res.user.emailVerified) {
              setViewState("verify");
              setPollAttempts(0);
              toast.success("Please verify your email to continue.");
              return;
          }
          
          // Sync verified user to DB
          await syncUserToFirestore(res.user);
          toast.success("Welcome back!");
      }

    } catch (err) {
        console.error("Auth error:", err);
        toast.error(getFriendlyErrorMessage(err.code));
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setValidationErrors({});
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const usr = result.user;
      
      // Google user is trusted, sync immediately
      await syncUserToFirestore(usr, {
          createdAt: serverTimestamp()
      });
      
      toast.success("Welcome! Redirecting...");
      // Navigation will happen automatically via useEffect
    } catch (err) {
      console.error("Google login error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(getFriendlyErrorMessage(err.code));
      }
      setLoading(false);
    }
  };

  const switchView = (view) => {
      // Clear all intervals before switching view
      clearAllIntervals();
      
      setViewState(view);
      setEmail("");
      setPassword("");
      setName("");
      setConfirmPass("");
      setValidationErrors({});
      setLoading(false);
      setPollAttempts(0);
  };

  if (authLoading) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
            <FaSpinner className="animate-spin text-3xl text-indigo-600" />
        </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden w-full bg-gradient-to-br from-gray-50 to-white flex flex-col font-sans">
      
      <header className="flex-none flex items-center justify-between px-6 md:px-16 h-20 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
            <FaFeatherAlt className="text-lg" />
          </div>
          <span className="text-2xl font-bold text-slate-800 tracking-tight">Likho</span>
        </div>
        <span className="hidden md:block text-sm font-semibold text-slate-500">Made with ❤️ by Likho Team</span>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-2">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          <div className="hidden lg:flex flex-col justify-center space-y-6 pr-6">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
              Share Your <span className="text-slate-800">Valuable</span> Thoughts
            </h1>
            <p className="text-lg text-slate-600">
              Join Likho A safe space to share your daily stories, public ideas, and private diary entries.
            </p>
            <div className="space-y-4 mt-4">
                <FeatureItem icon={<FaPenFancy className="text-indigo-600" />} title="Write Freely" desc="Express anything without limits" />
                <FeatureItem icon={<FaGlobeAmericas className="text-emerald-600" />} title="Share Globally" desc="Connect with a worldwide community" />
                <FeatureItem icon={<FaShieldAlt className="text-amber-600" />} title="Secret Diary" desc="Keep your personal thoughts private" />
            </div>
          </div>

          <div className="w-full max-w-md mx-auto bg-white border border-gray-200 px-8 py-6 rounded-3xl shadow-xl transition-all duration-300">
            
            {viewState === "verify" && (
                <div className="text-center animate-fade-in">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaEnvelope size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify your Email</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        We are auto-checking...<br/>
                        Link sent to: <span className="font-bold text-slate-800">{auth.currentUser?.email || email}</span>
                    </p>

                    <button 
                        onClick={handleManualCheck}
                        disabled={loading}
                        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold mb-3 hover:bg-black transition-all flex justify-center items-center gap-2"
                    >
                        {loading && <FaSpinner className="animate-spin" />}
                        {loading ? "Checking..." : "I have Verified"}
                    </button>

                    <button 
                        onClick={handleResendEmail}
                        disabled={resendCooldown > 0}
                        className="w-full py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : <>Resend Email <FaRedo className="text-xs" /></>}
                    </button>

                    <button 
                        onClick={() => { signOut(auth); switchView("login"); }} 
                        className="mt-6 text-sm text-slate-400 font-bold hover:text-slate-600 flex items-center justify-center gap-2 mx-auto"
                    >
                        Sign Out & Back
                    </button>
                </div>
            )}

            {viewState === "reset-sent" && (
                <div className="text-center animate-fade-in">
                      <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaPaperPlane size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your Inbox</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        We sent a password reset link to<br/>
                        <span className="font-bold text-slate-800">{email}</span>
                    </p>
                    <button onClick={() => switchView("login")} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all">
                        Back to Login
                    </button>
                </div>
            )}

            {["login", "signup", "forgot"].includes(viewState) && (
                <>
                    <h2 className="text-3xl font-bold text-center text-slate-900">
                    {viewState === "login" ? "Welcome Back" : viewState === "signup" ? "Create Account" : "Reset Password"}
                    </h2>
                    <p className="text-center text-slate-500 mt-1 mb-6">
                    {viewState === "login" ? "Login to continue" : viewState === "signup" ? "Sign up and start writing" : "Enter email to get reset link"}
                    </p>

                    <form onSubmit={handleAuth} className="space-y-2">
                        {viewState === "signup" && (
                            <div className="relative group">
                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <input
                                type="text" 
                                name="name"
                                placeholder="Full Name" 
                                autoComplete="name"
                                value={name} 
                                onChange={(e) => {
                                  setName(e.target.value);
                                  if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: undefined }));
                                }}
                                className={`w-full pl-11 pr-4 py-3 bg-gray-50 border-2 rounded-2xl text-slate-800 font-semibold outline-none focus:bg-white transition-all ${
                                  validationErrors.name ? 'border-red-400 focus:border-red-600' : 'border-gray-200 focus:border-slate-900'
                                }`}
                            />
                            {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
                            </div>
                        )}

                        <div className="relative group">
                            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <input
                                type="email" 
                                name="email"
                                placeholder="Email Address" 
                                autoComplete="email"
                                aria-label="Email Address"
                                value={email} 
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                  if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: undefined }));
                                }}
                                className={`w-full pl-11 pr-4 py-3 bg-gray-50 border-2 rounded-2xl text-slate-800 font-semibold outline-none focus:bg-white transition-all ${
                                  validationErrors.email ? 'border-red-400 focus:border-red-600' : 'border-gray-200 focus:border-slate-900'
                                }`}
                            />
                            {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                        </div>

                        {viewState !== "forgot" && (
                            <div className="relative group">
                                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="password" 
                                    name="password"
                                    placeholder="Password" 
                                    autoComplete="current-password"
                                    aria-label="Password"
                                    value={password} 
                                    onChange={(e) => {
                                      setPassword(e.target.value);
                                      if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: undefined }));
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 border-2 rounded-2xl text-slate-800 font-semibold outline-none focus:bg-white transition-all ${
                                      validationErrors.password ? 'border-red-400 focus:border-red-600' : 'border-gray-200 focus:border-slate-900'
                                    }`}
                                />
                                {validationErrors.password && <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>}
                            </div>
                        )}

                        {viewState === "signup" && (
                            <div className="relative group">
                                <FaCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                                <input
                                    type="password" 
                                    name="confirmPassword"
                                    placeholder="Confirm Password" 
                                    autoComplete="new-password"
                                    aria-label="Confirm Password"
                                    value={confirmPass} 
                                    onChange={(e) => {
                                      setConfirmPass(e.target.value);
                                      if (validationErrors.confirmPass) setValidationErrors(prev => ({ ...prev, confirmPass: undefined }));
                                    }}
                                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 border-2 rounded-2xl text-slate-800 font-semibold outline-none focus:bg-white transition-all ${
                                      validationErrors.confirmPass ? 'border-red-400 focus:border-red-600' : 'border-gray-200 focus:border-slate-900'
                                    }`}
                                />
                                {validationErrors.confirmPass && <p className="text-red-500 text-xs mt-1">{validationErrors.confirmPass}</p>}
                            </div>
                        )}

                        {viewState === "login" && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => switchView("forgot")} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                                    Forgot Password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-slate-900 text-white rounded-2xl text-lg font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <FaSpinner className="animate-spin text-sm" />}
                            {loading ? "Processing..." : viewState === "login" ? "Log In" : viewState === "signup" ? "Create Account" : "Send Reset Link"}
                        </button>
                    </form>

                    {viewState !== "forgot" && (
                        <>
                            <div className="my-6 flex items-center">
                                <div className="h-px bg-gray-200 flex-1" />
                                <span className="text-gray-400 text-xs px-2 font-medium uppercase">Or continue with</span>
                                <div className="h-px bg-gray-200 flex-1" />
                            </div>

                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full py-3 bg-white border-2 border-gray-200 rounded-2xl font-bold text-slate-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <FcGoogle size={22} />
                                Google
                            </button>
                        </>
                    )}

                    <div className="text-center text-sm mt-6 text-slate-600">
                        {viewState === "login" ? (
                            <>
                                New here? <button onClick={() => switchView("signup")} className="text-slate-900 font-bold hover:underline">Create Account</button>
                            </>
                        ) : viewState === "signup" ? (
                            <>
                                Already a member? <button onClick={() => switchView("login")} className="text-slate-900 font-bold hover:underline">Log In</button>
                            </>
                        ) : (
                            <button onClick={() => switchView("login")} className="text-slate-900 font-bold hover:underline flex items-center justify-center gap-2 w-full">
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