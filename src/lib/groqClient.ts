// Groq API client for EmotiCare
import axios from 'axios';
import { getCurrentUserProfile } from './userService';
import { countries } from './countries';

// Groq API endpoint
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Initialize with API key - directly using string since process.env is not available
const API_KEY = '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';

// Fallback responses in case API fails
const FALLBACK_RESPONSES = [
  "I'm here for you. How can I help you feel better today?",
  "That sounds challenging. Would you like to talk more about it?",
  "I understand how you feel. Let's work through this together.",
  "Thank you for sharing that with me. How are you coping?",
  "I'm listening and I care about what you're going through.",
  "Your feelings are valid. What would help you right now?",
  "I appreciate you opening up. Is there anything specific you need?",
  "I'm sorry you're experiencing this. What might make things a bit easier?",
  "You're not alone in this. I'm here to support you.",
  "That's completely understandable. How can I best support you today?"
];

// Function to generate chat responses using Groq
export async function generateChatResponse(messages: any[]) {
  try {
    console.log('Sending request to Groq API...');
    
    // Check if the first message is a system message
    const hasSystemMessage = messages.length > 0 && messages[0].role === 'system';
    
    // Get user preferences to customize the response
    const userProfile = await getCurrentUserProfile();
    let systemContent = 'You are EmotiCare, a friendly and empathetic AI companion. Your purpose is to provide emotional support through brief, conversational messages.';
    
    // Add user's country if available
    if (userProfile?.country) {
      const countryObj = countries.find(c => c.code === userProfile.country);
      if (countryObj) {
        systemContent += ` The user is from ${countryObj.name}. Provide culturally appropriate responses that respect the norms and context of ${countryObj.name}.`;
      } else {
        systemContent += ' Your primary user is from India.';
      }
    } else {
      systemContent += ' Your primary user is from India.';
    }
    
    // Add user's name if available
    if (userProfile?.displayName) {
      systemContent += ` The user's name is ${userProfile.displayName}. Address them by name occasionally.`;
    }
    
    // Apply message length preference
    if (userProfile?.messageLength === 'concise') {
      systemContent += ' Keep responses extremely brief (1 sentence max). Be direct and to-the-point.';
    } else if (userProfile?.messageLength === 'medium') {
      systemContent += ' Keep responses short (1-2 sentences max). Balance brevity with warmth.';
    } else if (userProfile?.messageLength === 'detailed') {
      systemContent += ' Provide thoughtful, more detailed responses (2-3 sentences). Offer more context and depth.';
    } else {
      systemContent += ' Keep responses very short (1-2 sentences max).';
    }
    
    // Apply response style preference
    if (userProfile?.responseStyle === 'conversational') {
      systemContent += ' Use a casual, friendly tone with occasional emojis. Respond as if texting a friend who needs support.';
    } else if (userProfile?.responseStyle === 'professional') {
      systemContent += ' Use a clear, respectful and slightly more formal tone. Be supportive yet professional in your approach.';
    } else if (userProfile?.responseStyle === 'friendly') {
      systemContent += ' Use a warm, encouraging tone with supportive language and appropriate emojis. Be like a caring friend.';
    } else {
      systemContent += ' Use a casual, friendly tone with occasional emojis.';
    }
    
    // Apply emotional support style preference
    if (userProfile?.emotionalSupport === 'empathetic') {
      systemContent += ' Focus on validating feelings and showing deep empathy. Prioritize emotional connection over solutions.';
    } else if (userProfile?.emotionalSupport === 'balanced') {
      systemContent += ' Balance empathy with gentle guidance. Validate feelings while offering perspective when appropriate.';
    } else if (userProfile?.emotionalSupport === 'motivational') {
      systemContent += ' Be encouraging and uplifting. Focus on positive reframing and inspiring confidence.';
    } else if (userProfile?.emotionalSupport === 'practical') {
      systemContent += ' Offer practical suggestions and action-oriented support. Focus on tangible next steps.';
    } else if (userProfile?.emotionalSupport === 'reflective') {
      systemContent += ' Ask thoughtful questions and help the user explore their feelings more deeply.';
    }
    
    systemContent += ' Avoid lengthy explanations or clinical language.';
    
    // Prepare the messages array for the API
    const apiMessages = hasSystemMessage 
      ? messages.map((msg, index) => index === 0 ? { ...msg, content: systemContent } : msg) // Replace system message with our customized one
      : [
          {
            role: 'system',
            content: systemContent
          },
          ...messages
        ];
    
    // Set timeout to prevent hanging requests
    const response = await axios.post(
      API_URL,
      {
        model: 'gemma2-9b-it', // Llama 3 8B model - fast and efficient
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 150, // Reduced max tokens to encourage shorter responses
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 10000 // 10 second timeout
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating chat response with Groq:', error);
    
    // More detailed error handling
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout');
        return getFallbackResponse("I'm having trouble connecting right now. Let's continue our conversation. How are you feeling?");
      }
      
      if (error.response) {
        console.error('API Response:', error.response.data);
        console.error('Status code:', error.response.status);
        
        if (error.response.status === 402) {
          return getFallbackResponse("I'm having a brief technical issue. But I'm still here for you. How can I help?");
        } else if (error.response.status === 401) {
          return getFallbackResponse("I'm experiencing a temporary authentication problem. Let's keep talking. What's on your mind?");
        } else if (error.response.status === 404) {
          return getFallbackResponse("I'm having trouble with my thinking process right now. But I'm still here to listen. How are you feeling?");
        } else if (error.response.status === 429) {
          return getFallbackResponse("I'm a bit overwhelmed with requests right now. Let's continue our conversation. How are you doing?");
        }
      }
    }
    
    // Return a fallback response instead of throwing an error
    return getFallbackResponse();
  }
}

// Helper function to get a fallback response
function getFallbackResponse(specificResponse?: string): string {
  if (specificResponse) return specificResponse;
  
  // Get a random fallback response
  const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return FALLBACK_RESPONSES[randomIndex];
}

// Export the Groq client functions
export const groq = {
  chat: {
    completions: {
      create: async (params: any) => {
        try {
          const response = await axios.post(
            API_URL,
            params,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
              },
              timeout: 10000 // 10 second timeout
            }
          );
          return response.data;
        } catch (error) {
          console.error('Error with Groq API:', error);
          // Return a mock response instead of throwing
          return {
            choices: [
              {
                message: {
                  content: getFallbackResponse()
                }
              }
            ]
          };
        }
      }
    }
  }
};

// For backward compatibility, we'll keep the deepseek export
export const deepseek = groq;
