// Add declarations for any missing browser APIs
interface Window {
  playBreathingVoice?: (phase: 'inhale' | 'hold' | 'exhale' | 'pause') => void;
} 