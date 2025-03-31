import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Phone, 
  Search, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  ExternalLink, 
  AlertTriangle, 
  Home, 
  Globe, 
  Moon,
  Sun,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";
import "./EmergencyResources.css";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { countries } from "@/lib/countries";

// Define resource types
type ResourceCategory = 
  | "crisis" 
  | "mental_health" 
  | "substance_abuse" 
  | "domestic_violence" 
  | "lgbtq" 
  | "veterans" 
  | "youth"
  | "health";

interface Resource {
  id: string;
  name: string;
  description: string;
  phone?: string;
  text?: string;
  website?: string;
  hours: string;
  categories: ResourceCategory[];
  tags: string[];
  countryCode?: string; // Country code the resource is available in
}

const EmergencyResources = () => {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isCriticalRedirect = location.state?.critical || searchParams.get('critical') === 'true';
  const [showUrgentBanner, setShowUrgentBanner] = useState(isCriticalRedirect);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | "all">("all");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [bookmarkedResources, setBookmarkedResources] = useState<string[]>([]);
  const [userCountry, setUserCountry] = useState<string>("IN"); // Default to India

  // Update user country when profile loads
  useEffect(() => {
    if (userProfile?.country) {
      setUserCountry(userProfile.country);
    }
  }, [userProfile]);

  // Get country name for display
  const countryName = React.useMemo(() => {
    const country = countries.find(c => c.code === userCountry);
    return country ? country.name : "India";
  }, [userCountry]);

  // All emergency resources data
  const allResources: Resource[] = [
    // India resources
    {
      id: "nimhans",
      name: "NIMHANS Mental Health Helpline",
      description: "National Institute of Mental Health & Neurosciences offers 24/7 toll-free helpline for mental health support.",
      phone: "080-4611 0007",
      website: "https://nimhans.ac.in/",
      hours: "24/7",
      categories: ["crisis", "mental_health"],
      tags: ["suicide", "crisis", "mental health", "depression", "anxiety"],
      countryCode: "IN"
    },
    {
      id: "aasra",
      name: "Aasra",
      description: "Crisis intervention center for the lonely, distressed, and suicidal.",
      phone: "9820466726",
      text: "SMS support available",
      website: "http://www.aasra.info/",
      hours: "24/7",
      categories: ["crisis", "mental_health"],
      tags: ["suicide", "crisis", "depression", "mental health"],
      countryCode: "IN"
    },
    {
      id: "vandrevala",
      name: "Vandrevala Foundation",
      description: "Mental health NGO providing free counseling and guidance to those suffering from mental health issues.",
      phone: "1860-2662-345",
      text: "9999666555",
      website: "https://www.vandrevalafoundation.com/",
      hours: "24/7",
      categories: ["mental_health"],
      tags: ["mental health", "counseling", "suicide", "depression"],
      countryCode: "IN"
    },
    {
      id: "childline",
      name: "CHILDLINE India",
      description: "India's first 24-hour, toll-free, emergency phone service for children in need of aid and assistance.",
      phone: "1098",
      website: "https://www.childlineindia.org/",
      hours: "24/7",
      categories: ["crisis", "youth"],
      tags: ["child abuse", "children", "emergency", "protection"],
      countryCode: "IN"
    },
    // US resources
    {
      id: "national-suicide-prevention-lifeline",
      name: "National Suicide Prevention Lifeline",
      description: "24/7, free and confidential support for people in distress, prevention and crisis resources.",
      phone: "988",
      website: "https://988lifeline.org/",
      hours: "24/7",
      categories: ["crisis", "mental_health"],
      tags: ["suicide", "crisis", "prevention"],
      countryCode: "US"
    },
    {
      id: "crisis-text-line",
      name: "Crisis Text Line",
      description: "Free, 24/7 text line for people in crisis.",
      text: "Text HOME to 741741",
      website: "https://www.crisistextline.org/",
      hours: "24/7",
      categories: ["crisis", "mental_health"],
      tags: ["crisis", "text", "mental health"],
      countryCode: "US"
    },
    {
      id: "samhsa",
      name: "SAMHSA's National Helpline",
      description: "Treatment referral and information service for individuals facing mental and/or substance use disorders.",
      phone: "1-800-662-4357",
      website: "https://www.samhsa.gov/find-help/national-helpline",
      hours: "24/7",
      categories: ["mental_health", "substance_abuse"],
      tags: ["treatment", "referral", "substance abuse", "mental health"],
      countryCode: "US"
    },
    // UK resources
    {
      id: "samaritans",
      name: "Samaritans",
      description: "Confidential support for people experiencing feelings of distress or despair.",
      phone: "116 123",
      website: "https://www.samaritans.org/",
      hours: "24/7",
      categories: ["crisis", "mental_health"],
      tags: ["suicide", "distress", "emotional support"],
      countryCode: "GB"
    },
    {
      id: "mind",
      name: "Mind",
      description: "Mental health charity offering information and advice.",
      phone: "0300 123 3393",
      text: "Text 86463",
      website: "https://www.mind.org.uk/",
      hours: "9 AM to 6 PM, Monday-Friday",
      categories: ["mental_health"],
      tags: ["mental health", "advice", "information"],
      countryCode: "GB"
    },
    // Global resources
    {
      id: "who-mental-health",
      name: "WHO Mental Health Resources",
      description: "World Health Organization's global resources for mental health.",
      website: "https://www.who.int/health-topics/mental-health",
      hours: "Always available online",
      categories: ["mental_health"],
      tags: ["global", "mental health", "information", "resources"],
      countryCode: "global"
    },
    {
      id: "international-association-suicide-prevention",
      name: "International Association for Suicide Prevention",
      description: "Global resources for suicide prevention, crisis centers worldwide.",
      website: "https://www.iasp.info/resources/Crisis_Centres/",
      hours: "Always available online",
      categories: ["crisis", "mental_health"],
      tags: ["global", "suicide", "prevention", "crisis"],
      countryCode: "global"
    }
  ];

  // Filter resources based on user's country
  const resources = React.useMemo(() => {
    return allResources.filter(resource => 
      resource.countryCode === userCountry || resource.countryCode === "global"
    );
  }, [userCountry]);

  // Toggle dark mode
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Toggle bookmark
  const toggleBookmark = (resourceId: string) => {
    setBookmarkedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  // Filter resources by search query and category
  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchQuery === "" || 
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = activeCategory === "all" || 
      resource.categories.includes(activeCategory as ResourceCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Category display elements
  const categories = [
    { id: "all", label: "All Resources", icon: Globe },
    { id: "crisis", label: "Crisis", icon: AlertTriangle },
    { id: "mental_health", label: "Mental Health", icon: Heart },
    { id: "health", label: "Health", icon: Heart },
    { id: "youth", label: "Child Services", icon: MessageCircle },
  ];

  // Emergency number based on country
  const getEmergencyNumber = () => {
    switch(userCountry) {
      case "US":
        return "911";
      case "GB":
        return "999";
      case "IN":
        return "112";
      default:
        return "112"; // Default to India
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <AnimatedBackground />
        
        {/* Subtle animated pattern overlay */}
        <div className="emergency-resources-background"></div>
        
        {/* Ambient floating elements */}
        <div className="absolute inset-0">
          {/* Larger floating circles */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={`large-circle-${i}`}
              className={`absolute rounded-full animate-float ${
                isDarkMode ? 'bg-red-500/5' : 'bg-red-500/10'
              }`}
              style={{
                width: `${Math.random() * 300 + 100}px`,
                height: `${Math.random() * 300 + 100}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 20 + 20}s`,
              }}
            />
          ))}
          
          {/* Smaller particles */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={`particle-${i}`}
              className={`absolute rounded-full ${
                isDarkMode ? 'bg-white/10' : 'bg-red-500/20'
              } animate-float`}
              style={{
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Header */}
      <Header />
      
      {/* Urgent Alert Banner */}
      {showUrgentBanner && (
        <div className="sticky top-16 container mx-auto z-50 px-4 pt-2 pb-0">
          <Alert variant="destructive" className="pulse-crisis border-2 border-red-500 shadow-lg">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-bold">Urgent: Help is Available</AlertTitle>
            <AlertDescription className="text-base">
              <p className="mb-2">We've detected concerning content that may indicate you or someone else is in crisis.</p>
              <p className="mb-2">If this is an immediate emergency, please call <a href={`tel:${getEmergencyNumber()}`} className="underline font-bold">{getEmergencyNumber()}</a> ({countryName}'s emergency services) right away.</p>
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={() => setShowUrgentBanner(false)}>
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Main Content */}
      <main className="container mx-auto px-4 pt-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <Card className={`relative overflow-hidden backdrop-blur-md border shadow-lg ${isDarkMode ? 'bg-slate-800/90 text-white border-slate-700' : 'bg-white/90 border-slate-200'}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Emergency Resources for {countryName}
                </CardTitle>
                <CardDescription className={isDarkMode ? "text-slate-300" : "text-slate-500"}>
                  Quick access to helplines and support during times of crisis
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                className="rounded-full h-10 w-10"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </CardHeader>
            
            <CardContent>
              {/* Search and filter */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search resources..." 
                    className={`pl-10 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : ''}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {/* Categories */}
                <ScrollArea className="w-full whitespace-nowrap py-4">
                  <div className="flex gap-2 pb-2 w-max">
                    {categories.map(category => {
                      const Icon = category.icon;
                      return (
                        <Button 
                          key={category.id} 
                          onClick={() => setActiveCategory(category.id as ResourceCategory | "all")}
                          variant={activeCategory === category.id ? "default" : "outline"}
                          size="sm"
                          className={`gap-1 ${
                            activeCategory === category.id && category.id === "crisis" ? "bg-red-600 hover:bg-red-700" : ""
                          } ${isDarkMode && activeCategory !== category.id ? "text-white border-slate-600" : ""}`}
                        >
                          <Icon className="h-4 w-4" />
                          {category.label}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Resources grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredResources.length > 0 ? (
                  filteredResources.map(resource => (
                    <Card 
                      key={resource.id}
                      className={`relative overflow-hidden border ${
                        resource.categories.includes("crisis") 
                          ? `${isDarkMode ? 'border-red-800 bg-red-950/40' : 'border-red-200 bg-red-50'}`
                          : isDarkMode ? 'border-slate-700 bg-slate-800/80' : ''
                      } h-full`}
                    >
                      {resource.categories.includes("crisis") && (
                        <div className="absolute top-0 right-0">
                          <Badge variant="destructive" className="rounded-none rounded-bl-md">
                            <AlertTriangle className="h-3 w-3 mr-1" /> 
                            Crisis Resource
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl pr-8">{resource.name}</CardTitle>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 -mt-1 -mr-1"
                            onClick={() => toggleBookmark(resource.id)}
                          >
                            <Bookmark 
                              className={`h-5 w-5 ${
                                bookmarkedResources.includes(resource.id) 
                                  ? 'fill-current text-amber-500' 
                                  : ''
                              }`} 
                            />
                          </Button>
                        </div>
                        <CardDescription className={isDarkMode ? "text-slate-300" : ""}>
                          {resource.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-2">
                          {resource.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-green-600" />
                              <a 
                                href={`tel:${resource.phone.replace(/\D/g, '')}`}
                                className="font-medium hover:underline text-green-600"
                              >
                                {resource.phone}
                              </a>
                              <Badge variant="outline" className="ml-2">Call</Badge>
                            </div>
                          )}
                          
                          {resource.text && (
                            <div className="flex items-center">
                              <MessageCircle className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="font-medium">{resource.text}</span>
                              <Badge variant="outline" className="ml-2">Text</Badge>
                            </div>
                          )}
                          
                          {resource.website && (
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 mr-2 text-purple-600" />
                              <a 
                                href={resource.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-medium hover:underline text-purple-600 flex items-center"
                              >
                                Visit Website
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-orange-500" />
                            <span>{resource.hours}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-dashed">
                            {resource.tags.map(tag => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className={isDarkMode ? "bg-slate-700 hover:bg-slate-600" : ""}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-2 py-10 text-center">
                    <p className="text-lg">No resources found matching your search.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Disclaimer */}
              <div className={`mt-8 p-4 rounded-lg text-sm ${isDarkMode ? "bg-slate-700/50 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                <p className="font-medium flex items-center">
                  <Info className="h-4 w-4 mr-2 text-blue-500" />
                  Important Information
                </p>
                <p className="mt-2">
                  If you or someone you know is in immediate danger, please call emergency services (112 in India) immediately. 
                  The resources provided here are meant to offer support but may not be suitable for all emergency situations.
                </p>
                <p className="mt-2">
                  EmotiCare is not affiliated with any of the organizations listed. Information is provided as a public service 
                  and may change without notice. Always verify contact information before reaching out. Some helplines may operate only in specific languages or regions within India.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Clock icon component
const Clock = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
};

// Mobile-friendly emergency resources component with India-specific resources
export const MiniEmergencyResources = () => {
  // Only include the most critical resources for the mini version
  const criticalResources = [
    {
      id: "nimhans",
      name: "NIMHANS Mental Health Helpline",
      description: "24/7 mental health support",
      phone: "080-4611 0007",
      text: undefined
    },
    {
      id: "childline",
      name: "CHILDLINE India",
      description: "Emergency helpline for children",
      phone: "1098",
      text: undefined
    },
    {
      id: "kiran",
      name: "KIRAN Mental Health Helpline",
      description: "National toll-free helpline",
      phone: "1800-599-0019",
      text: "SMS support may be available"
    }
  ];

  return (
    <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-red-900">
      <h3 className="font-bold text-lg mb-2 flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
        Emergency Resources
      </h3>
      
      <div className="space-y-3">
        {criticalResources.map(resource => (
          <div key={resource.id} className="flex flex-col">
            <span className="font-medium">{resource.name}</span>
            <span className="text-sm text-red-700">{resource.description}</span>
            {resource.phone && (
              <a 
                href={`tel:${resource.phone.replace(/\D/g, '')}`}
                className="text-sm font-medium text-green-700 flex items-center mt-1"
              >
                <Phone className="h-3 w-3 mr-1" />
                Call: {resource.phone}
              </a>
            )}
            {resource.text && (
              <span className="text-sm text-blue-700 flex items-center mt-1">
                <MessageCircle className="h-3 w-3 mr-1" />
                Text: {resource.text}
              </span>
            )}
          </div>
        ))}
        
        <div className="pt-2 mt-2 border-t border-red-200">
          <Button variant="default" size="sm" className="bg-red-600 hover:bg-red-700 text-white w-full" asChild>
            <Link to="/emergency">
              <ExternalLink className="h-3 w-3 mr-1" />
              View All Resources
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyResources; 