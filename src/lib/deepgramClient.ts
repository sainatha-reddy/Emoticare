// Deepgram API client for speech-to-text transcription and text-to-speech
import axios from 'axios';

// Deepgram API information
const DEEPGRAM_API_KEY = '5f719f68964a20a225ef79a8225c6cc144bbf574';
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';
const DEEPGRAM_TTS_API_URL = 'https://api.deepgram.com/v1/speak';

// Type for transcription response
interface DeepgramTranscriptionResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
      }>;
    }>;
  };
}

/**
 * Transcribes audio to text using Deepgram
 * @param audioBlob The audio blob to transcribe
 * @returns A promise that resolves to the transcription text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await axios.post<DeepgramTranscriptionResponse>(
      DEEPGRAM_API_URL,
      audioBlob,
      {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': audioBlob.type || 'audio/wav'
        },
        params: {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true
        }
      }
    );

    // Extract the transcript from the response
    if (response.data && 
        response.data.results && 
        response.data.results.channels && 
        response.data.results.channels[0] && 
        response.data.results.channels[0].alternatives && 
        response.data.results.channels[0].alternatives[0]) {
      return response.data.results.channels[0].alternatives[0].transcript;
    } else {
      throw new Error('Invalid response format from Deepgram API');
    }
  } catch (error) {
    console.error('Error transcribing audio with Deepgram:', error);
    throw error;
  }
}

/**
 * Converts text to speech using Deepgram
 * @param text The text to convert to speech
 * @param options Optional parameters to customize the speech
 * @returns A promise that resolves to an audio blob
 */
export async function textToSpeech(
  text: string, 
  options?: {
    pitch?: number;   // Pitch adjustment (0.5 to 1.5)
    speed?: number;   // Speed adjustment (0.5 to 1.5)
    voice?: string;   // Voice model to use
  }
): Promise<Blob> {
  try {
    // Analyze the text for better speech parameters
    const isQuestion = text.includes('?');
    const isExclamation = text.includes('!');
    const wordCount = text.split(/\s+/).length;
    
    // Set default voice
    const voice = options?.voice || 'aura-english-us';
    
    // Determine optimal speed based on content
    // Deepgram accepts speed between 0.5 and 1.5
    let speed = options?.speed || 1.0;
    
    // Adjust speed based on text characteristics if not manually specified
    if (!options?.speed) {
      // Longer messages should be spoken slightly faster
      if (wordCount > 30) speed = 1.05;
      // Questions slightly slower
      else if (isQuestion) speed = 0.95;
      // Exclamations slightly faster
      else if (isExclamation) speed = 1.1;
      // Default for medium length messages
      else if (wordCount > 15) speed = 1.0;
      // Slightly slower for short messages for clarity
      else speed = 0.98;
    }
    
    // Determine pitch - default is 1.0, range is 0.5 to 1.5
    // Deepgram doesn't support pitch, but we'll keep the parameter for future compatibility
    const pitch = options?.pitch || 1.0;
    
    // Clean text for better TTS rendering
    // Replace repeated punctuation with single punctuation
    const cleanedText = text
      .replace(/([!?])+/g, '$1')  // Replace multiple ! or ? with single
      .replace(/\.{2,}/g, '...')  // Replace multiple periods with ellipsis
      .replace(/\s+/g, ' ')       // Replace multiple spaces with single space
      .trim();
    
    const response = await axios.post(
      DEEPGRAM_TTS_API_URL,
      { text: cleanedText },
      {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          voice: voice,
          encoding: 'mp3',
          speed: speed,
        },
        responseType: 'arraybuffer'
      }
    );

    // Convert the response to a blob
    return new Blob([response.data], { type: 'audio/mp3' });
  } catch (error) {
    console.error('Error generating speech with Deepgram:', error);
    throw error;
  }
}

// Error handler function
export function handleDeepgramError(error: any): boolean {
  // Check if the error is a rate limit error
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      console.warn('Deepgram API rate limit reached, falling back to browser API');
      return true; // Signal that we should fall back to the browser's API
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Deepgram API authentication error', error.response.data);
      return true; // Fall back on auth errors
    }
  }
  
  return false; // For other errors, let the caller decide what to do
} 