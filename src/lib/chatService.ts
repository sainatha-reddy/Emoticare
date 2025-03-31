import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  limit as limitQuery,
  DocumentData,
  Timestamp,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  QuerySnapshot
} from 'firebase/firestore';

// Chat message interface
export interface ChatMessage {
  id?: string;
  userId: string;
  content: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: Date;
  emotion?: string;
  sentiment?: number;
  transcription?: boolean;
}

// Chat session interface with messages included
export interface ChatSession {
  id?: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  messages: ChatMessage[];
  summary?: string;
  chatType?: 'text' | 'voice';
}

/**
 * Save a chat message to the current session
 */
export async function saveChatMessage(message: Omit<ChatMessage, 'id'>, sessionId: string): Promise<string> {
  try {
    // Input validation
    if (!sessionId) {
      throw new Error('Session ID is required to save a message');
    }
    if (!message.userId) {
      throw new Error('User ID is required in the message');
    }
    if (!message.content || !message.content.trim()) {
      throw new Error('Message content cannot be empty');
    }

    // Get the session document
    const sessionRef = doc(db, 'chatSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      throw new Error('Session not found');
    }
    
    const currentData = sessionDoc.data();
    if (!currentData) {
      throw new Error('Invalid session data');
    }

    // Ensure messages array exists
    const currentMessages = Array.isArray(currentData.messages) ? currentData.messages : [];
    
    // Create new message object with proper timestamp handling
    const messageTimestamp = message.timestamp instanceof Date 
      ? Timestamp.fromDate(message.timestamp)
      : serverTimestamp();

    const newMessage = {
      id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: message.userId,
      content: message.content.trim(),
      sender: message.sender,
      timestamp: messageTimestamp,
      emotion: message.emotion || null,
      sentiment: typeof message.sentiment === 'number' ? message.sentiment : null
    };

    // Update session with new message
    await updateDoc(sessionRef, {
      messages: [...currentMessages, newMessage],
      messageCount: (currentData.messageCount || 0) + 1,
      lastUpdated: serverTimestamp()
    });

    return newMessage.id;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to save message to session');
  }
}

/**
 * Start a new chat session
 */
export async function createChatSession(userId: string, chatType: 'text' | 'voice' = 'text'): Promise<string> {
  try {
    if (!userId) {
      throw new Error('User ID is required to create a chat session');
    }

    // Create initial session data
    const session = {
      userId,
      startTime: serverTimestamp(),
      messageCount: 0,
      messages: [], // Empty array to store messages
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      chatType // Store the chat type (text or voice)
    };
    
    // Add the session to Firestore
    const docRef = await addDoc(collection(db, 'chatSessions'), session);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating chat session:', error);
    throw error;
  }
}

/**
 * End a chat session
 */
export async function endChatSession(sessionId: string): Promise<void> {
  try {
    const sessionRef = doc(db, 'chatSessions', sessionId);
    await updateDoc(sessionRef, {
      endTime: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error ending chat session:', error);
    throw error;
  }
}

/**
 * Get chat sessions for a user
 */
export async function getUserChatSessions(userId: string, limitCount = 10): Promise<ChatSession[]> {
  try {
    // Try with ordering if index exists
    let querySnapshot: QuerySnapshot;
    try {
      const orderedQuery = query(
        collection(db, 'chatSessions'),
        where('userId', '==', userId),
        orderBy('startTime', 'desc'),
        limitQuery(limitCount)
      );
      querySnapshot = await getDocs(orderedQuery);
    } catch (indexError) {
      console.warn('Index not found, falling back to simple query:', indexError);
      // Fall back to simple query without ordering
      const fallbackQuery = query(
        collection(db, 'chatSessions'),
        where('userId', '==', userId),
        limitQuery(limitCount)
      );
      querySnapshot = await getDocs(fallbackQuery);
    }
    
    const sessions: ChatSession[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const messages = data.messages || [];
      
      // Convert message timestamps
      const processedMessages = messages.map((msg: any) => ({
        id: msg.id || doc.id + '-' + Math.random().toString(36).substring(2),
        userId: msg.userId,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp?.toDate() || new Date(),
        emotion: msg.emotion,
        sentiment: msg.sentiment,
        transcription: msg.transcription
      }));
      
      sessions.push({
        id: doc.id,
        userId: data.userId,
        startTime: data.startTime?.toDate() || new Date(),
        endTime: data.endTime?.toDate(),
        messageCount: data.messageCount || processedMessages.length,
        messages: processedMessages,
        summary: data.summary,
        chatType: data.chatType || 'text' // Include the chat type, default to 'text' if not set
      });
    });
    
    return sessions;
  } catch (error) {
    console.error('Error getting user chat sessions:', error);
    throw error;
  }
}

/**
 * Get a specific chat session
 */
export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  try {
    const sessionRef = doc(db, 'chatSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      return null;
    }
    
    const data = sessionDoc.data();
    const messages = data.messages || [];
    
    // Convert message timestamps
    const processedMessages = messages.map((msg: any) => ({
      id: msg.id || sessionId + '-' + Math.random().toString(36).substring(2),
      userId: msg.userId,
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.timestamp?.toDate() || new Date(),
      emotion: msg.emotion,
      sentiment: msg.sentiment,
      transcription: msg.transcription
    }));
    
    return {
      id: sessionDoc.id,
      userId: data.userId,
      startTime: data.startTime?.toDate() || new Date(),
      endTime: data.endTime?.toDate(),
      messageCount: data.messageCount || processedMessages.length,
      messages: processedMessages,
      summary: data.summary,
      chatType: data.chatType || 'text' // Include the chat type, default to 'text' if not set
    };
  } catch (error) {
    console.error('Error getting chat session:', error);
    return null;
  }
}

/**
 * Clear all chat sessions for a user
 */
export async function clearAllUserSessions(userId: string): Promise<void> {
  try {
    // Get all sessions for the user
    const sessionsQuery = query(
      collection(db, 'chatSessions'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(sessionsQuery);
    
    // Delete each session
    const deletePromises = querySnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    console.log('Successfully cleared all chat sessions for user:', userId);
  } catch (error) {
    console.error('Error clearing chat sessions:', error);
    throw error;
  }
}

/**
 * Schedules regular chat analysis for a user
 * This function can be called when the user logs in
 */
export async function scheduleRegularAnalysis(userId: string): Promise<void> {
  // This is a client-side implementation, but in a production environment,
  // you would likely use a server-side scheduled job or cloud function
  
  try {
    // Run initial analysis
    const initialAnalysis = await analyzeUserChats(userId);
    console.log('Initial chat analysis complete:', initialAnalysis);
    
    // Schedule periodic analysis (every 30 minutes)
    // Note: In a production app, this would be done server-side
    const intervalId = setInterval(async () => {
      const analysis = await analyzeUserChats(userId);
      console.log('Scheduled chat analysis complete:', analysis);
    }, 30 * 60 * 1000); // 30 minutes
    
    // Store the interval ID to clear it when user logs out
    window.__chatAnalysisIntervals = window.__chatAnalysisIntervals || {};
    window.__chatAnalysisIntervals[userId] = intervalId;
    
  } catch (error) {
    console.error('Error scheduling regular analysis:', error);
  }
}

/**
 * Stops scheduled chat analysis for a user
 * This function should be called when the user logs out
 */
export function stopScheduledAnalysis(userId: string): void {
  if (window.__chatAnalysisIntervals && window.__chatAnalysisIntervals[userId]) {
    clearInterval(window.__chatAnalysisIntervals[userId]);
    delete window.__chatAnalysisIntervals[userId];
    console.log('Stopped scheduled chat analysis for user:', userId);
  }
}

/**
 * Analyzes user's chat data and saves the analysis to Firestore
 */
export async function analyzeUserChats(userId: string): Promise<any> {
  try {
    // Import the analysis function without creating a circular dependency
    const { analyzeChatHistory } = await import('./chatAnalytics');
    return await analyzeChatHistory(userId);
  } catch (error) {
    console.error('Error analyzing user chats:', error);
    throw error;
  }
}

/**
 * Delete a specific chat session
 * @param sessionId ID of the session to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    if (!sessionId) {
      throw new Error('Session ID is required to delete a session');
    }
    
    // Get the session document reference
    const sessionRef = doc(db, 'chatSessions', sessionId);
    
    // Check if the session exists
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) {
      throw new Error('Session not found');
    }
    
    // Delete the session
    await deleteDoc(sessionRef);
    
    console.log(`Session ${sessionId} successfully deleted`);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
}

// Declare the global window property to store interval IDs
declare global {
  interface Window {
    __chatAnalysisIntervals?: Record<string, NodeJS.Timeout>;
  }
} 