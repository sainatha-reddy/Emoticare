import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AuthProvider } from '@/hooks/useAuth';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Chatbot from '@/pages/Chatbot';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import Stats from '@/pages/Stats';
import Profile from '@/pages/Profile';
import VoiceChat from '@/pages/VoiceChat';
import Breathing from '@/pages/Breathing';
import AccountSettings from '@/pages/AccountSettings';
import EmergencyResources from '@/pages/EmergencyResources';
import SafeSpace from '@/pages/SafeSpace';
import ProtectedRoute from '@/components/ProtectedRoute';

// Initialize React Query client
const queryClient = new QueryClient();

// Global error fallback
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <p className="text-gray-700 mb-4">We're sorry, but there was an error loading the page.</p>
        <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto mb-4">
          {error.message}
        </pre>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route 
                  path="/chatbot" 
                  element={
                    <ProtectedRoute>
                      <Chatbot />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/voicechat" 
                  element={
                    <ProtectedRoute>
                      <VoiceChat />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/breathing" 
                  element={
                    <ProtectedRoute>
                      <Breathing />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/safespace" 
                  element={
                    <ProtectedRoute>
                      <SafeSpace />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/emergency" 
                  element={
                    <EmergencyResources />
                  } 
                />
                <Route 
                  path="/stats" 
                  element={
                    <ProtectedRoute>
                      <Stats />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/account-settings" 
                  element={
                    <ProtectedRoute>
                      <AccountSettings />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
