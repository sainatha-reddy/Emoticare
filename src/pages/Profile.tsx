import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import { LogOut, Settings, User, Globe } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfile } from "@/lib/userService";
import { useNavigate } from "react-router-dom";
import { DEFAULT_AVATAR, MALE_AVATAR, FEMALE_AVATAR } from "@/lib/userService";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import AnimatedBackground from "@/components/AnimatedBackground";
import RoboCharacter from "@/components/3d/RoboCharacter";
import { countries } from "@/lib/countries";

// CSS for animation
import "./Profile.css";

const Profile = () => {
  const { userProfile, loading, refreshUserProfile, currentUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [country, setCountry] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [emotionalSupport, setEmotionalSupport] = useState("balanced");
  const [messageLength, setMessageLength] = useState("medium");
  const [responseStyle, setResponseStyle] = useState("conversational");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Load user profile data when available
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.displayName || "");
      setEmail(userProfile.email || "");
      setBio(userProfile.bio || "");
      setDateOfBirth(userProfile.dateOfBirth || "");
      setGender(userProfile.gender || "");
      setOccupation(userProfile.occupation || "");
      setCountry(userProfile.country || "");
      setSelectedAvatar(userProfile.photoURL || DEFAULT_AVATAR);
      setEmotionalSupport(userProfile.emotionalSupport || "balanced");
      setMessageLength(userProfile.messageLength || "medium");
      setResponseStyle(userProfile.responseStyle || "conversational");
    }
  }, [userProfile]);

  // Update avatar when gender changes
  useEffect(() => {
    if (gender === "male") {
      setSelectedAvatar(MALE_AVATAR);
    } else if (gender === "female") {
      setSelectedAvatar(FEMALE_AVATAR);
    }
  }, [gender]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [loading, currentUser, navigate]);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateUserProfile({
        displayName: name,
        bio,
        emotionalSupport,
        messageLength,
        responseStyle,
        dateOfBirth,
        gender,
        occupation,
        country,
        photoURL: selectedAvatar
      });
      
      // Refresh user profile data
      await refreshUserProfile();
      
      setIsLoading(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully!",
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
      console.error("Profile update error:", error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-purple-50">
        <p>Loading profile...</p>
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
      <main className="container mx-auto px-4 pt-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-1/4">
            <Card className="backdrop-blur-md bg-white/90 border shadow-md">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={selectedAvatar || DEFAULT_AVATAR} />
                    <AvatarFallback>{name ? name.substring(0, 2).toUpperCase() : "JD"}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold">{name || "User"}</h2>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
                
                <div className="mt-8">
                  <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>

                <div className="mt-8 flex justify-center">
                  <div className="animate-float">
                    <RoboCharacter 
                      width={300} 
                      height={300} 
                      className="drop-shadow-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
          
          {/* Main Content */}
          <div className="flex-1">
            <Card className="backdrop-blur-md bg-white/90 border shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text">
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="space-y-4">
                    {/* Avatar Selection */}
                    <div className="space-y-4">
                      <Label>Select Avatar</Label>
                      <div className="flex gap-8 items-center justify-center p-4 border rounded-lg bg-white/50">
                        <div className="flex flex-col items-center gap-2">
                          <Avatar className="h-20 w-20 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => { setGender("male"); setSelectedAvatar(MALE_AVATAR); }}>
                            <AvatarImage src={MALE_AVATAR} />
                          </Avatar>
                          <Label className="cursor-pointer">
                            <RadioGroup value={gender} onValueChange={(value) => { setGender(value); setSelectedAvatar(value === "male" ? MALE_AVATAR : FEMALE_AVATAR); }}>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="male" id="male" />
                                <label htmlFor="male">Male</label>
                              </div>
                            </RadioGroup>
                          </Label>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                          <Avatar className="h-20 w-20 cursor-pointer hover:ring-2 hover:ring-primary transition-all" onClick={() => { setGender("female"); setSelectedAvatar(FEMALE_AVATAR); }}>
                            <AvatarImage src={FEMALE_AVATAR} />
                          </Avatar>
                          <Label className="cursor-pointer">
                            <RadioGroup value={gender} onValueChange={(value) => { setGender(value); setSelectedAvatar(value === "male" ? MALE_AVATAR : FEMALE_AVATAR); }}>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="female" id="female" />
                                <label htmlFor="female">Female</label>
                              </div>
                            </RadioGroup>
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white/80"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled
                            className="bg-white/80"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us a little about yourself"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="min-h-[100px] bg-white/80"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emotional-support">Emotional Support Style</Label>
                          <Select value={emotionalSupport} onValueChange={setEmotionalSupport}>
                            <SelectTrigger className="bg-white/80">
                              <SelectValue placeholder="Select support style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empathetic">Empathetic & Nurturing</SelectItem>
                              <SelectItem value="balanced">Balanced Approach</SelectItem>
                              <SelectItem value="motivational">Motivational & Encouraging</SelectItem>
                              <SelectItem value="practical">Practical & Solution-Focused</SelectItem>
                              <SelectItem value="reflective">Reflective & Analytical</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            This helps EmotiCare adjust its responses to better meet your emotional needs.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="occupation">Occupation</Label>
                          <Input
                            id="occupation"
                            value={occupation}
                            onChange={(e) => setOccupation(e.target.value)}
                            placeholder="Your job title or role"
                            className="bg-white/80"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="bg-white/80"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="bg-white/80">
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          This helps EmotiCare adjust its responses based on your location and cultural context.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Communication Preferences Section */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-4">Communication Preferences</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="font-medium">Message Length</Label>
                        <div className="flex items-center space-x-2">
                          <RadioGroup 
                            value={messageLength} 
                            onValueChange={setMessageLength}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="concise" id="concise" />
                              <Label htmlFor="concise" className="font-normal">Concise</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="medium" id="medium" />
                              <Label htmlFor="medium" className="font-normal">Medium</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="detailed" id="detailed" />
                              <Label htmlFor="detailed" className="font-normal">Detailed</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label className="font-medium">Response Style</Label>
                        <div className="flex items-center space-x-2">
                          <RadioGroup 
                            value={responseStyle} 
                            onValueChange={setResponseStyle}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="conversational" id="conversational" />
                              <Label htmlFor="conversational" className="font-normal">Conversational</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="professional" id="professional" />
                              <Label htmlFor="professional" className="font-normal">Professional</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="friendly" id="friendly" />
                              <Label htmlFor="friendly" className="font-normal">Friendly</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isLoading} 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      {isLoading ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-50 border-t-transparent" />
                          Updating...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
