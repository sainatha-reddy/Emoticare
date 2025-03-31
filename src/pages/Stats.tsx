import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { BarChart2, LineChart as LineChartIcon, PieChart as PieChartIcon, Calendar, Activity, MessageSquare, Clock } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, isWithinInterval } from "date-fns";
import { auth } from "@/lib/firebase";
import AnimatedBackground from "@/components/AnimatedBackground";
import { 
  analyzeChatHistory, 
  getUserEngagementTrend, 
  getEmotionDistribution, 
  getSentimentTrend,
  ChatAnalysis
} from "@/lib/chatAnalytics";
import { getUserChatSessions, ChatMessage, ChatSession } from "@/lib/chatService";

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"];
const SENTIMENT_COLORS = {
  positive: "#00C49F",
  neutral: "#FFBB28",
  negative: "#FF8042"
};

// Time period options
const TIME_PERIODS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" }
];

const Stats = () => {
  const { userProfile, loading } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<ChatAnalysis | null>(null);
  const [engagementData, setEngagementData] = useState<ChatSession[]>([]);
  const [emotionData, setEmotionData] = useState<{name: string, value: number}[]>([]);
  const [sentimentData, setSentimentData] = useState<{date: string, sentiment: number}[]>([]);
  const [messageActivityData, setMessageActivityData] = useState<{date: string, count: number}[]>([]);
  const [messageTypeData, setMessageTypeData] = useState<{name: string, value: number}[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  // Run analysis when period changes or on initial load
  useEffect(() => {
    if (userProfile?.uid) {
      runAnalysis(userProfile.uid);
    }
  }, [userProfile, selectedPeriod]);

  // Generate empty activity data for initialization
  const generateEmptyActivityData = () => {
    const days = parseInt(selectedPeriod);
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MMM dd');
      data.push({
        date,
        count: 0
      });
    }
    
    return data;
  };

  // Analyze chat data
  const runAnalysis = async (userId: string) => {
    setIsAnalyzing(true);
    setMessageActivityData(generateEmptyActivityData());
    
    try {
      // Get chat sessions
      let sessions: ChatSession[] = [];
      
      try {
        sessions = await getUserChatSessions(userId, 100);
        setChatSessions(sessions);
        
        // Extract all messages from all sessions
        const allMessages: ChatMessage[] = [];
        sessions.forEach(session => {
          if (session.messages && session.messages.length > 0) {
            allMessages.push(...session.messages);
          }
        });
        setChatMessages(allMessages);
        
        // If no messages or sessions, display empty state
        if (allMessages.length === 0 || sessions.length === 0) {
          setAnalyticsData({
            userId,
            timestamp: new Date(),
            messageCount: 0,
            userMessageCount: 0,
            botMessageCount: 0,
            averageUserMessageLength: 0,
            averageBotMessageLength: 0
          });
          setMessageTypeData([
            { name: 'User Messages', value: 0 },
            { name: 'Bot Responses', value: 0 }
          ]);
          setEmotionData([]);
          setSentimentData([]);
          setIsAnalyzing(false);
          return;
        }
        
        // Process the message activity data
        processMessageActivityData(allMessages);
        
        // Generate message type distribution
        const userMessages = allMessages.filter(msg => msg.sender === 'user');
        const botMessages = allMessages.filter(msg => msg.sender === 'bot');
        setMessageTypeData([
          { name: 'User Messages', value: userMessages.length },
          { name: 'Bot Responses', value: botMessages.length }
        ]);
        
        // Set local analytics data if the API call fails
        const localAnalytics = {
          userId,
          timestamp: new Date(),
          messageCount: allMessages.length,
          userMessageCount: userMessages.length,
          botMessageCount: botMessages.length,
          averageUserMessageLength: calculateAvgLength(userMessages),
          averageBotMessageLength: calculateAvgLength(botMessages)
        };
        
        // Run analytics from the API which will be more comprehensive
        try {
          const analysis = await analyzeChatHistory(userId);
          setAnalyticsData(analysis);
        } catch (analysisError) {
          console.error('Error running chat analysis:', analysisError);
          // Use our locally calculated analytics as fallback
          setAnalyticsData(localAnalytics);
        }
        
        // Get engagement trend
        try {
          const engagement = await getUserEngagementTrend(userId, parseInt(selectedPeriod));
          setEngagementData(engagement);
        } catch (engagementError) {
          console.error('Error getting engagement data:', engagementError);
          setEngagementData(sessions.filter(session => {
            const daysAgo = subDays(new Date(), parseInt(selectedPeriod));
            return session.startTime >= daysAgo;
          }));
        }
        
        // Process emotion distribution from messages
        try {
          // First try the API
          const emotions = await getEmotionDistribution(userId);
          
          if (Object.keys(emotions).length > 0) {
            const emotionChartData = Object.entries(emotions).map(([name, value]) => ({
              name,
              value
            }));
            setEmotionData(emotionChartData);
          } else {
            // Local calculation as fallback
            const emotionCounts: Record<string, number> = {};
            allMessages.forEach(msg => {
              if (msg.emotion) {
                emotionCounts[msg.emotion] = (emotionCounts[msg.emotion] || 0) + 1;
              }
            });
            
            const localEmotionData = Object.entries(emotionCounts).map(([name, value]) => ({
              name,
              value
            }));
            
            setEmotionData(localEmotionData);
          }
        } catch (emotionError) {
          console.error('Error getting emotion distribution:', emotionError);
          
          // Local calculation as fallback
          const emotionCounts: Record<string, number> = {};
          allMessages.forEach(msg => {
            if (msg.emotion) {
              emotionCounts[msg.emotion] = (emotionCounts[msg.emotion] || 0) + 1;
            }
          });
          
          const localEmotionData = Object.entries(emotionCounts).map(([name, value]) => ({
            name,
            value
          }));
          
          setEmotionData(localEmotionData);
        }
        
        // Get sentiment trend
        try {
          const sentiment = await getSentimentTrend(userId, parseInt(selectedPeriod));
          
          if (sentiment.length > 0) {
            const sentimentChartData = sentiment.map(item => ({
              date: format(item.date, 'MMM dd'),
              sentiment: parseFloat(item.sentiment.toFixed(2))
            }));
            setSentimentData(sentimentChartData);
          } else {
            // Local calculation as fallback
            const daysAgo = subDays(new Date(), parseInt(selectedPeriod));
            const messagesWithSentiment = allMessages.filter(msg => 
              msg.sentiment !== undefined && msg.timestamp >= daysAgo
            );
            
            // Group by date
            const sentimentByDate: Record<string, number[]> = {};
            messagesWithSentiment.forEach(msg => {
              const dateStr = format(msg.timestamp, 'MMM dd');
              if (!sentimentByDate[dateStr]) {
                sentimentByDate[dateStr] = [];
              }
              if (msg.sentiment !== undefined) {
                sentimentByDate[dateStr].push(msg.sentiment);
              }
            });
            
            // Calculate average sentiment per day
            const localSentimentData = Object.entries(sentimentByDate).map(([date, values]) => {
              const avgSentiment = values.reduce((sum, val) => sum + val, 0) / values.length;
              return {
                date,
                sentiment: parseFloat(avgSentiment.toFixed(2))
              };
            });
            
            setSentimentData(localSentimentData);
          }
        } catch (sentimentError) {
          console.error('Error getting sentiment trend:', sentimentError);
          
          // Local calculation as fallback
          const daysAgo = subDays(new Date(), parseInt(selectedPeriod));
          const messagesWithSentiment = allMessages.filter(msg => 
            msg.sentiment !== undefined && msg.timestamp >= daysAgo
          );
          
          // Group by date
          const sentimentByDate: Record<string, number[]> = {};
          messagesWithSentiment.forEach(msg => {
            const dateStr = format(msg.timestamp, 'MMM dd');
            if (!sentimentByDate[dateStr]) {
              sentimentByDate[dateStr] = [];
            }
            if (msg.sentiment !== undefined) {
              sentimentByDate[dateStr].push(msg.sentiment);
            }
          });
          
          // Calculate average sentiment per day
          const localSentimentData = Object.entries(sentimentByDate).map(([date, values]) => {
            const avgSentiment = values.reduce((sum, val) => sum + val, 0) / values.length;
            return {
              date,
              sentiment: parseFloat(avgSentiment.toFixed(2))
            };
          });
          
          setSentimentData(localSentimentData);
        }
        
      } catch (error) {
        console.error('Error fetching chat data:', error);
        
        // Set empty states for all data
        setAnalyticsData({
          userId,
          timestamp: new Date(),
          messageCount: 0,
          userMessageCount: 0,
          botMessageCount: 0,
          averageUserMessageLength: 0,
          averageBotMessageLength: 0
        });
        
        setChatSessions([]);
        setChatMessages([]);
        setMessageTypeData([
          { name: 'User Messages', value: 0 },
          { name: 'Bot Responses', value: 0 }
        ]);
        setEmotionData([]);
        setSentimentData([]);
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch chat data. Please try again later.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error analyzing chat data:', error);
      
      // Set fallback data
      setAnalyticsData({
        userId,
        timestamp: new Date(),
        messageCount: 0,
        userMessageCount: 0,
        botMessageCount: 0,
        averageUserMessageLength: 0,
        averageBotMessageLength: 0
      });
      
      setMessageTypeData([
        { name: 'User Messages', value: 0 },
        { name: 'Bot Responses', value: 0 }
      ]);
      
      setEmotionData([]);
      setSentimentData([]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze chat data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Helper function to calculate average message length
  const calculateAvgLength = (messages: ChatMessage[]): number => {
    if (messages.length === 0) return 0;
    const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return totalLength / messages.length;
  };

  // Process message activity by day
  const processMessageActivityData = (messages: ChatMessage[]) => {
    const days = parseInt(selectedPeriod);
    const activityByDay: Record<string, number> = {};
    
    // Initialize all days with 0 count
    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM dd');
      activityByDay[dateStr] = 0;
    }
    
    // Count messages per day
    messages.forEach(msg => {
      const msgDate = msg.timestamp;
      const cutoffDate = subDays(new Date(), days);
      
      if (msgDate && isWithinInterval(msgDate, { start: cutoffDate, end: new Date() })) {
        const dateStr = format(msgDate, 'MMM dd');
        activityByDay[dateStr] = (activityByDay[dateStr] || 0) + 1;
      }
    });
    
    // Convert to array format for chart
    const chartData = Object.entries(activityByDay).map(([date, count]) => ({
      date,
      count
    }));
    
    setMessageActivityData(chartData);
  };

  // Get sentiment color based on value
  const getSentimentColor = (value: number) => {
    if (value > 0.3) return SENTIMENT_COLORS.positive;
    if (value < -0.3) return SENTIMENT_COLORS.negative;
    return SENTIMENT_COLORS.neutral;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground />
      
      {/* Header */}
      <Header />
      
      {/* Main content with top padding to account for fixed header */}
      <main className="container mx-auto px-4 pt-6 pb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Chat Analytics</h1>
          
          <div className="flex items-center gap-2">
            <Select
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              disabled={isAnalyzing}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => userProfile?.uid && runAnalysis(userProfile.uid)}
              disabled={isAnalyzing || !userProfile}
            >
              {isAnalyzing ? "Analyzing..." : "Refresh"}
            </Button>
          </div>
        </div>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Messages</CardTitle>
              <CardDescription>All time message count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analyticsData?.messageCount || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {analyticsData?.userMessageCount || 0} from you, {analyticsData?.botMessageCount || 0} from EmotiCare
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Chat Sessions</CardTitle>
              <CardDescription>Total conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {chatSessions.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Avg. {Math.round((analyticsData?.messageCount || 0) / (chatSessions.length || 1))} messages per session
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Average Sentiment</CardTitle>
              <CardDescription>Overall emotional tone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: getSentimentColor(analyticsData?.averageSentiment || 0) }}>
                {analyticsData?.averageSentiment !== undefined 
                  ? analyticsData.averageSentiment > 0 
                    ? `+${analyticsData.averageSentiment.toFixed(2)}` 
                    : analyticsData.averageSentiment.toFixed(2)
                  : "N/A"
                }
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {analyticsData?.averageSentiment !== undefined 
                  ? analyticsData.averageSentiment > 0.3 
                    ? "Mostly positive" 
                    : analyticsData.averageSentiment < -0.3 
                      ? "Mostly negative" 
                      : "Neutral"
                  : "No sentiment data available"
                }
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="activity" className="flex items-center gap-1"><Activity className="h-4 w-4" /> Activity</TabsTrigger>
            <TabsTrigger value="sentiment" className="flex items-center gap-1"><LineChartIcon className="h-4 w-4" /> Sentiment</TabsTrigger>
            <TabsTrigger value="emotions" className="flex items-center gap-1"><PieChartIcon className="h-4 w-4" /> Emotions</TabsTrigger>
            <TabsTrigger value="engagement" className="flex items-center gap-1"><BarChart2 className="h-4 w-4" /> Engagement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Message Activity</CardTitle>
                <CardDescription>Number of messages over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : messageActivityData.some(item => item.count > 0) ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={messageActivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Messages" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-gray-500">No message activity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sentiment" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Trend</CardTitle>
                <CardDescription>Emotional tone of conversations over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : sentimentData.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sentimentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[-1, 1]} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sentiment" 
                          stroke="#8884d8" 
                          name="Sentiment" 
                          dot={{ strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center">
                    <p className="text-gray-500">No sentiment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="emotions" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Emotion Distribution</CardTitle>
                <CardDescription>Breakdown of detected emotions</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center justify-center">
                {isAnalyzing ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : emotionData.length > 0 ? (
                  <>
                    <div className="h-[400px] w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={emotionData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={130}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {emotionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} messages`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="w-full md:w-1/2 grid grid-cols-2 gap-2 mt-4 md:mt-0">
                      {emotionData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{item.name}: {item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[400px] w-full flex items-center justify-center">
                    <p className="text-gray-500">No emotion data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="engagement" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Message Distribution</CardTitle>
                <CardDescription>User vs Bot messages</CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : messageTypeData.some(item => item.value > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={messageTypeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill="#0088FE" />
                            <Cell fill="#00C49F" />
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} messages`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Message Length</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Your messages (avg)</span>
                            <span>{Math.round(analyticsData?.averageUserMessageLength || 0)} characters</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (analyticsData?.averageUserMessageLength || 0) / 2)}%` 
                              }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Bot responses (avg)</span>
                            <span>{Math.round(analyticsData?.averageBotMessageLength || 0)} characters</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (analyticsData?.averageBotMessageLength || 0) / 5)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-2">Chat Sessions</h3>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Total sessions</span>
                            <span>{chatSessions.length}</span>
                          </div>
                          
                          <div className="flex justify-between text-sm mb-1">
                            <span>Last 7 days</span>
                            <span>
                              {chatSessions.filter(session => 
                                isWithinInterval(session.startTime, { 
                                  start: subDays(new Date(), 7), 
                                  end: new Date() 
                                })
                              ).length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-gray-500">No message distribution data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Stats; 