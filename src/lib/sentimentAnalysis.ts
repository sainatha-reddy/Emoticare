/**
 * Simple sentiment analysis utility that uses a lexicon-based approach
 * to detect the sentiment of text. In a production environment, you would
 * use a more sophisticated sentiment analysis library or API.
 */

import Sentiment from 'sentiment';

// Initialize the sentiment analyzer
const sentiment = new Sentiment();

// Emotion mapping based on sentiment score ranges
const getEmotionFromScore = (score: number): string => {
  if (score <= -5) return 'Very Negative';
  if (score < -2) return 'Negative';
  if (score < 2) return 'Neutral';
  if (score < 5) return 'Positive';
  return 'Very Positive';
};

export interface SentimentAnalysis {
  emotion: string;
  sentiment: number;
  comparative: number;
  tokens: string[];
  words: string[];
  positive: string[];
  negative: string[];
}

export function analyzeText(text: string): SentimentAnalysis {
  try {
    // Perform sentiment analysis
    const result = sentiment.analyze(text);
    
    // Get the normalized sentiment score (-1 to 1)
    const normalizedScore = result.comparative;
    
    // Map the score to an emotion
    const emotion = getEmotionFromScore(result.score);
    
    return {
      emotion,
      sentiment: normalizedScore,
      comparative: result.comparative,
      tokens: result.tokens,
      words: result.words,
      positive: result.positive,
      negative: result.negative
    };
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    // Return neutral sentiment if analysis fails
    return {
      emotion: 'Neutral',
      sentiment: 0,
      comparative: 0,
      tokens: [],
      words: [],
      positive: [],
      negative: []
    };
  }
}

// Function to get color based on sentiment score
export function getSentimentColor(score: number): string {
  if (score <= -0.6) return 'rgb(239, 68, 68)'; // red-500
  if (score < -0.2) return 'rgb(249, 115, 22)'; // orange-500
  if (score < 0.2) return 'rgb(234, 179, 8)';   // yellow-500
  if (score < 0.6) return 'rgb(34, 197, 94)';   // green-500
  return 'rgb(22, 163, 74)';                     // green-600
}

// Function to get emoji based on emotion
export function getEmotionEmoji(emotion: string): string {
  switch (emotion) {
    case 'Very Negative':
      return '😢';
    case 'Negative':
      return '😕';
    case 'Neutral':
      return '😐';
    case 'Positive':
      return '😊';
    case 'Very Positive':
      return '😄';
    default:
      return '😐';
  }
} 