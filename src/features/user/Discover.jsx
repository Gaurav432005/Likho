import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Loading } from "../../components/ui/Loading";
import { EmptyState } from "../../components/ui/EmptyState";
import { FaSearch, FaUserPlus, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

/**
 * Discover - Find new people through search
 * Don't show all users, let user search for them
 */
export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Real-time search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Search by displayName
        const q = query(
          collection(db, "users"),
          where("displayName", ">=", searchTerm),
          where("displayName", "<=", searchTerm + "\uf8ff"),
          orderBy("displayName")
        );
        
        let snapshot = await getDocs(q);
        let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // If no results, try searching by email
        if (results.length === 0) {
          const emailQ = query(
            collection(db, "users"),
            where("email", ">=", searchTerm),
            where("email", "<=", searchTerm + "\uf8ff"),
            orderBy("email")
          );
          snapshot = await getDocs(emailQ);
          results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // Filter out self
        const filtered = results.filter(u => u.id !== user?.uid);

        if (isMountedRef.current) {
          setSearchResults(filtered);
        }
      } catch (error) {
        console.error("Search error:", error);
        if (isMountedRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }, 500); // Debounce 500ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Discover People</h1>
        
        {/* Search Box */}
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-full focus:outline-none focus:border-slate-900 transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      {loading && <Loading message="Searching..." />}
      
      {!loading && !hasSearched && (
        <EmptyState
          icon={FaSearch}
          title="Find Your Friends"
          description="Search for people by their name or email to connect with them"
          variant="default"
        />
      )}
      
      {!loading && hasSearched && searchResults.length === 0 && (
        <EmptyState
          icon={FaUser}
          title="No users found"
          description="Try searching with different keywords"
          variant="default"
        />
      )}
      
      {!loading && searchResults.length > 0 && (
        <div className="space-y-3">
          {searchResults.map(userItem => (
            <div key={userItem.id} className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 hover:shadow-md transition-shadow flex items-start gap-4">
              <Avatar src={userItem.photoURL} name={userItem.displayName} size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{userItem.displayName}</h3>
                <p className="text-sm text-slate-500 truncate">{userItem.email}</p>
                {userItem.bio && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{userItem.bio}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => handleViewProfile(userItem.id)}
                  className="whitespace-nowrap"
                >
                  View
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    toast.success("Follow feature coming soon!");
                  }}
                  className="whitespace-nowrap"
                >
                  <FaUserPlus />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
