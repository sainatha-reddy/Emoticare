import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy, 
  Timestamp,
  doc,
  getDoc,
  limit as limitQuery,
  addDoc,
  serverTimestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { ChatMessage, ChatSession } from './chatService';

// Analysis result structure
export interface ChatAnalysis {
  id?: string;
  userId: string;
  timestamp: Date;
  messageCount: number;
  userMessageCount: number;
  botMessageCount: number;
  averageUserMessageLength: number;
  averageBotMessageLength: number;
  topEmotions?: Record<string, number>;
  averageSentiment?: number;
  duration?: number;  // in minutes
}

/**
 * Safely process document data
 */
function processDocData(doc: DocumentData): ChatMessage {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId || "",
    content: data.content || "",
    sender: data.sender || "user",
    timestamp: data.timestamp?.toDate() || new Date(),
    emotion: data.emotion,
    sentiment: data.sentiment
  };
}

/**
 * Analyze chat messages for a specific user
 */
export async function analyzeChatHistory(userId: string): Promise<ChatAnalysis> {
  try {
    // Query all sessions for this user
    const sessionsRef = collection(db, 'chatSessions');
    
    // First try a simple query without ordering to check for existence
    const simpleQuery = query(
      sessionsRef,
      where('userId', '==', userId),
      limitQuery(1)
    );
    
    const countSnapshot = await getDocs(simpleQuery);
    
    if (countSnapshot.empty) {
      console.log('No chat sessions found for user:', userId);
      return {
        userId,
        timestamp: new Date(),
        messageCount: 0,
        userMessageCount: 0,
        botMessageCount: 0,
        averageUserMessageLength: 0,
        averageBotMessageLength: 0,
      };
    }
    
    // Get all sessions - try with ordering if index exists
    let querySnapshot: QuerySnapshot;
    try {
      const orderedQuery = query(
        sessionsRef,
        where('userId', '==', userId),
        orderBy('startTime', 'desc')
      );
      querySnapshot = await getDocs(orderedQuery);
    } catch (indexError) {
      console.warn('Index not found, falling back to simple query:', indexError);
      // Fall back to simple query without ordering
      const fallbackQuery = query(
        sessionsRef,
        where('userId', '==', userId)
      );
      querySnapshot = await getDocs(fallbackQuery);
    }
    
    // Extract all messages from all sessions
    const messages: ChatMessage[] = [];
    const sessions: ChatSession[] = [];
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        if (!data) return; // Skip if no data
        
        const sessionMessages = data.messages || [];
        if (!Array.isArray(sessionMessages)) return; // Skip if messages is not an array
        
        // Process messages within this session
        sessionMessages.forEach((msg: any) => {
          if (!msg || typeof msg !== 'object') return; // Skip invalid messages
          
          try {
            messages.push({
              id: msg.id || doc.id + '-' + messages.length,
              userId: msg.userId || userId,
              content: msg.content || "",
              sender: msg.sender || "user",
              timestamp: msg.timestamp?.toDate() || new Date(),
              emotion: msg.emotion,
              sentiment: msg.sentiment
            });
          } catch (msgError) {
            console.error('Error processing message:', msgError);
            // Skip this message and continue
          }
        });
        
        // Add session to list
        sessions.push({
          id: doc.id,
          userId: data.userId || userId,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate(),
          messageCount: data.messageCount || sessionMessages.length,
          messages: [], // We don't need to duplicate the messages here
          summary: data.summary
        });
      } catch (docError) {
        console.error('Error processing session document:', docError);
        // Skip this document and continue
      }
    });
    
    // If no valid messages found, return empty analysis
    if (messages.length === 0) {
      console.log('No valid messages found in sessions for user:', userId);
      return {
        userId,
        timestamp: new Date(),
        messageCount: 0,
        userMessageCount: 0,
        botMessageCount: 0,
        averageUserMessageLength: 0,
        averageBotMessageLength: 0,
      };
    }
    
    // Calculate statistics
    const userMessages = messages.filter(msg => msg.sender === 'user');
    const botMessages = messages.filter(msg => msg.sender === 'bot');
    
    const userMessageCount = userMessages.length;
    const botMessageCount = botMessages.length;
    
    const userMessageLengths = userMessages.map(msg => msg.content.length);
    const botMessageLengths = botMessages.map(msg => msg.content.length);
    
    const averageUserMessageLength = userMessageLengths.length > 0 
      ? userMessageLengths.reduce((sum, length) => sum + length, 0) / userMessageLengths.length 
      : 0;
      
    const averageBotMessageLength = botMessageLengths.length > 0 
      ? botMessageLengths.reduce((sum, length) => sum + length, 0) / botMessageLengths.length 
      : 0;
    
    // Gather emotion data if available
    const emotionCounts: Record<string, number> = {};
    let totalSentiment = 0;
    let sentimentCount = 0;
    
    messages.forEach(msg => {
      if (msg.emotion) {
        emotionCounts[msg.emotion] = (emotionCounts[msg.emotion] || 0) + 1;
      }
      
      if (typeof msg.sentiment === 'number') {
        totalSentiment += msg.sentiment;
        sentimentCount++;
      }
    });
    
    const averageSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : undefined;
    
    // Create analysis object
    const analysis: ChatAnalysis = {
      userId,
      timestamp: new Date(),
      messageCount: messages.length,
      userMessageCount,
      botMessageCount,
      averageUserMessageLength,
      averageBotMessageLength,
      topEmotions: Object.keys(emotionCounts).length > 0 ? emotionCounts : undefined,
      averageSentiment,
      duration: sessions.length > 0 ? 
        Math.ceil((Date.now() - sessions[sessions.length - 1].startTime.getTime()) / (1000 * 60)) : 0
    };
    
    try {
      // Save the analysis to Firebase
      const docRef = await addDoc(collection(db, 'chatAnalytics'), {
        ...analysis,
        timestamp: serverTimestamp()
      });
      
      console.log('Successfully saved chat analysis for user:', userId);
      
      // Return the analysis with the document ID
      return {
        ...analysis,
        id: docRef.id
      };
    } catch (saveError) {
      console.error('Error saving analysis to Firebase:', saveError);
      // Still return the analysis even if saving failed
      return analysis;
    }
  } catch (error) {
    console.error('Error analyzing chat history:', error);
    // Return a basic analysis object to avoid breaking the UI
    return {
      userId,
      timestamp: new Date(),
      messageCount: 0,
      userMessageCount: 0,
      botMessageCount: 0,
      averageUserMessageLength: 0,
      averageBotMessageLength: 0,
    };
  }
}

/**
 * Get user engagement metrics over time
 */
export async function getUserEngagementTrend(userId: string, days = 30): Promise<ChatSession[]> {
  try {
    // Calculate date for specified days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    // Query chat sessions within the time period
    const sessionsRef = collection(db, 'chatSessions');
    
    // First check if sessions collection exists
    const checkQuery = query(
      sessionsRef,
      where('userId', '==', userId),
      limitQuery(1)
    );
    
    const checkSnapshot = await getDocs(checkQuery);
    
    if (checkSnapshot.empty) {
      return []; // No sessions found
    }
    
    // Then get sessions with proper query
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
    );
    
    const querySnapshot = await getDocs(q);
    const sessions: ChatSession[] = [];
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        // We don't need to load all messages for trending data
        sessions.push({
          id: doc.id,
          userId: data.userId,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate(),
          messageCount: data.messageCount || (data.messages?.length || 0),
          messages: [], // Empty array since we don't need messages for engagement trend
          summary: data.summary
        });
      } catch (docError) {
        console.error('Error processing session document:', docError);
        // Skip this document and continue
      }
    });
    
    // Filter to last X days and sort by startTime
    return sessions
      .filter(session => 
        session.startTime >= daysAgo
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      
  } catch (error) {
    console.error('Error getting user engagement trend:', error);
    return []; // Return empty array to avoid breaking the UI
  }
}

/**
 * Get emotion distribution for a user's messages
 */
export async function getEmotionDistribution(userId: string): Promise<Record<string, number>> {
  try {
    // Query all messages with emotions for this user
    const messagesRef = collection(db, 'chatMessages');
    
    const q = query(
      messagesRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const emotionCounts: Record<string, number> = {};
    
    if (querySnapshot.empty) {
      return {}; // No messages found
    }
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        const emotion = data.emotion;
        
        if (emotion) {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
      } catch (docError) {
        console.error('Error processing emotion document:', docError);
        // Skip this document and continue
      }
    });
    
    return emotionCounts;
  } catch (error) {
    console.error('Error getting emotion distribution:', error);
    return {}; // Return empty object to avoid breaking the UI
  }
}

/**
 * Get sentiment trend over time
 */
export async function getSentimentTrend(userId: string, days = 30): Promise<{date: Date, sentiment: number}[]> {
  try {
    // Calculate date for specified days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    // Query messages with sentiment
    const messagesRef = collection(db, 'chatMessages');
    
    const q = query(
      messagesRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const sentimentData: {date: Date, sentiment: number}[] = [];
    
    if (querySnapshot.empty) {
      return []; // No messages found
    }
    
    querySnapshot.forEach((doc) => {
      try {
        const data = doc.data();
        
        if (data.sentiment !== undefined && data.timestamp) {
          const messageDate = data.timestamp.toDate();
          
          // Filter by date range
          if (messageDate >= daysAgo) {
            sentimentData.push({
              date: messageDate,
              sentiment: data.sentiment
            });
          }
        }
      } catch (docError) {
        console.error('Error processing sentiment document:', docError);
        // Skip this document and continue
      }
    });
    
    // Sort by date
    sentimentData.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return sentimentData;
  } catch (error) {
    console.error('Error getting sentiment trend:', error);
    return []; // Return empty array to avoid breaking the UI
  }
} 