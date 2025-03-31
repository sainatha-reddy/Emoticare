import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import AnimatedBackground from "@/components/AnimatedBackground";
import RoboCharacter from "@/components/3d/RoboCharacter";

// CSS for animation
import "./Profile.css";

const AccountSettings = () => {
  const navigate = useNavigate();
  const { userProfile, loading, currentUser } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState(true);
  const [languagePreference, setLanguagePreference] = useState("english");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [loading, currentUser, navigate]);

  const saveSettings = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Settings Saved",
        description: "Your account settings have been updated successfully.",
      });
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />
      
      {/* Header */}
      <Header />
      
      {/* Main content with top padding to account for fixed header */}
      <main className="container mx-auto px-4 pt-6 pb-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex justify-center">
            <div className="animate-float">
              <RoboCharacter 
                width={200} 
                height={200} 
                className="drop-shadow-xl"
              />
            </div>
          </div>
          
          <Card className="backdrop-blur-md bg-white/90 border shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text">
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive email updates about your conversations</p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4" />
              
              {/* Appearance Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Appearance Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4" />
              
              {/* Accessibility Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Accessibility Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="speech-feedback" className="font-medium">Speech Feedback</Label>
                      <p className="text-sm text-muted-foreground">Enable voice responses from EmotiCare</p>
                    </div>
                    <Switch
                      id="speech-feedback"
                      checked={speechFeedback}
                      onCheckedChange={setSpeechFeedback}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4" />
              
              {/* Privacy Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Privacy Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Data Collection</Label>
                      <p className="text-sm text-muted-foreground">Allow anonymous data collection to improve services</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage Data
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Delete Account</Label>
                      <p className="text-sm text-muted-foreground">Permanently delete your account and data</p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={saveSettings}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  {isLoading ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AccountSettings; 