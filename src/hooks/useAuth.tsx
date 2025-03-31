import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserProfile, UserProfile, updateLastLogin } from '@/lib/userService';
import { scheduleRegularAnalysis, stopScheduledAnalysis } from '@/lib/chatService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile data
  const fetchUserProfile = async (user: User) => {
    try {
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
      // Update last login time
      await updateLastLogin(user.uid);
      // Schedule regular chat analysis
      scheduleRegularAnalysis(user.uid);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Refresh user profile data
  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (currentUser?.uid && !user) {
        // User has logged out, stop scheduled analysis
        stopScheduledAnalysis(currentUser.uid);
      }
      
      setCurrentUser(user);
      
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // Clean up any scheduled analysis on unmount
      if (currentUser?.uid) {
        stopScheduledAnalysis(currentUser.uid);
      }
    };
  }, [currentUser]);

  const value = {
    currentUser,
    userProfile,
    loading,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 