import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import EmotiCareLogo from "@/components/EmotiCareLogo";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import AnimatedBackground from "@/components/AnimatedBackground";

// Step types definition
type Step = "details" | "additional";

const Signup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("details");

  // User information
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Additional information
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [interests, setInterests] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === "details") {
      // Validate the first step
      if (!name || !email || !password || !confirmPassword) {
        toast({
          title: "Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }
      
      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
      
      // Move to next step
      setCurrentStep("additional");
      return;
    }
    
    // Process the second step and create account
    try {
      setIsLoading(true);
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store additional user information in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        age: age || null,
        gender: gender || null,
        interests: interests || null,
        createdAt: serverTimestamp(),
        // Add any default values for the user here
        mood_logs: [],
        messages: [],
        settings: {
          theme: "light",
          notifications: true,
        }
      });
      
      setIsLoading(false);
      toast({
        title: "Account created",
        description: "Your account has been created successfully!",
      });
      
      // Navigate to the home page or login
      navigate("/");
      
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Sign up failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      console.error("Signup error:", error);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check if this is a new user (if they have additional data already)
      const userDocRef = doc(db, "users", user.uid);
      
      // Set basic user data in Firestore
      await setDoc(userDocRef, {
        name: user.displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        // Add any default values for the user here
        mood_logs: [],
        messages: [],
        settings: {
          theme: "light",
          notifications: true,
        }
      }, { merge: true }); // Use merge to avoid overwriting existing data
      
      setIsLoading(false);
      toast({
        title: "Account created",
        description: "Your account has been created successfully with Google!",
      });
      
      navigate("/");
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Google Sign up failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      console.error("Google signup error:", error);
    }
  };

  const renderAccountDetailsStep = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white/80"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/80"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white/80"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="bg-white/80"
          required
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
      >
        Continue
      </Button>
    </form>
  );

  const renderAdditionalInfoStep = () => (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="age">Age (Optional)</Label>
        <Input
          id="age"
          type="number"
          placeholder="25"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="bg-white/80"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gender">Gender (Optional)</Label>
        <Input
          id="gender"
          placeholder="Male, Female, Non-binary, etc."
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="bg-white/80"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="interests">Interests (Optional)</Label>
        <Input
          id="interests"
          placeholder="Meditation, Exercise, Reading, etc."
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          className="bg-white/80"
        />
      </div>
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          className="w-1/2 bg-white hover:bg-gray-50"
          onClick={() => setCurrentStep("details")}
        >
          Back
        </Button>
        <Button 
          type="submit" 
          className="w-1/2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-50 border-t-transparent" />
              Signing up...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />
      
      {/* Logo */}
      <div className="pt-8 flex justify-center">
        <EmotiCareLogo />
      </div>
      
      {/* Main content */}
      <main className="container mx-auto px-4 pt-8 py-12">
        <div className="flex justify-center items-center">
          <Card className="w-full max-w-md backdrop-blur-md bg-white/90 border shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center bg-gradient-to-r from-purple-600 to-blue-500 inline-block text-transparent bg-clip-text">
                {currentStep === "details" ? "Create an Account" : "Additional Information"}
              </CardTitle>
              <CardDescription className="text-center">
                {currentStep === "details" 
                  ? "Enter your details to create your account" 
                  : "Tell us a bit more about yourself (optional)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStep === "details" ? renderAccountDetailsStep() : renderAdditionalInfoStep()}
              
              {currentStep === "details" && (
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white/80 px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      className="w-full bg-white hover:bg-gray-50 flex items-center justify-center gap-2" 
                      onClick={handleGoogleSignIn} 
                      disabled={isLoading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col">
              <p className="text-center text-sm">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-500 hover:text-blue-600"
                >
                  Log in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Signup;
