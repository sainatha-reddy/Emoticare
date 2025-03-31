import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User, updateProfile } from 'firebase/auth';

// User profile interface
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio?: string;
  timezone?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  occupation?: string;
  country?: string;
  emotionalSupport?: string;
  messageLength?: string;
  responseStyle?: string;
  interests?: string[];
  createdAt?: string;
  lastLogin?: string;
  updatedAt?: string;
}

// Default avatars
export const MALE_AVATAR = 'https://img.freepik.com/free-photo/androgynous-avatar-non-binary-queer-person_23-2151100226.jpg?t=st=1742217523~exp=1742221123~hmac=4c2b4a8b5af23c3b44bd0cac2f6d605d3b525fd83ee535b71863328ae4eed695&w=826';
export const FEMALE_AVATAR = 'https://img.freepik.com/premium-photo/memoji-beautiful-girl-woman-white-background-emoji_826801-6872.jpg?w=826';
export const DEFAULT_AVATAR = MALE_AVATAR;

// Get current user profile from Firestore
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log('No user is signed in');
      return null;
    }
    
    return await getUserProfile(currentUser.uid);
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return null;
  }
}

// Get user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    } else {
      console.log('No user profile found, creating from auth data');
      // If no profile exists, create one from auth data
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === uid) {
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        
        // Save the new profile
        await setDoc(userDocRef, newProfile);
        return newProfile;
      }
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Update user's last login time
export async function updateLastLogin(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      lastLogin: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// Update user profile
export async function updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is signed in');
    }
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    
    // Update Firestore document
    await updateDoc(userDocRef, { 
      ...profile,
      updatedAt: new Date().toISOString() 
    });

    // If display name is being updated, also update it in Firebase Auth
    if (profile.displayName && profile.displayName !== currentUser.displayName) {
      await updateProfile(currentUser, {
        displayName: profile.displayName
      });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
} 