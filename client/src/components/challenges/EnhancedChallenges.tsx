import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { ChallengeWizard } from "./ChallengeWizard";
import { 
  Trophy, 
  Users, 
  Target, 
  Clock, 
  TrendingUp,
  Zap,
  Star,
  Flame,
  Calendar,
  Award,
  UserCheck,
  Timer
} from "lucide-react";
import type { CommunityChallenge } from "@shared/schema";

export function EnhancedChallenges() {
  const [selectedChallenge, setSelectedChallenge] = useState<CommunityChallenge | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: challenges, isLoading } = useQuery<CommunityChallenge[]>({
    queryKey: ["/api/challenges"],
  });

  const handleJoinChallenge = (challenge: CommunityChallenge) => {
    setSelectedChallenge(challenge);
    setWizardOpen(true);
  };

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case 'group': return {
        bg: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
        border: "border-green-200 dark:border-green-800",
        icon: "text-green-600 dark:text-green-400",
        badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      };
      case 'solo': return {
        bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-600 dark:text-blue-400",
        badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      };
      default: return {
        bg: "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950",
        border: "border-gray-200 dark:border-gray-800",
        icon: "text-gray-600 dark:text-gray-400",
        badge: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      };
    }
  };

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getProgressPercentage = (current: string, target: string) => {
    const currentAmount = parseFloat(current || "0");
    const targetAmount = parseFloat(target);
    return Math.min((currentAmount / targetAmount) * 100, 100);
  };

  const getDifficulty = (targetAmount: string) => {
    const amount = parseFloat(targetAmount);
    if (amount < 5000) return { level: "Easy", color: "text-green-600", icon: "🟢" };
    if (amount < 20000) return { level: "Medium", color: "text-yellow-600", icon: "🟡" };
    return { level: "Hard", color: "text-red-600", icon: "🔴" };
  };

  const getTrendingStatus = (challenge: CommunityChallenge) => {
    const progress = getProgressPercentage(challenge.currentAmount || "0", challenge.targetAmount);
    const daysLeft = getDaysLeft(challenge.endDate.toString());
    
    // Mock trending algorithm based on progress and time
    const trendingScore = progress + (30 - daysLeft);
    return trendingScore > 50;
  };

  const categorizedChallenges = challenges?.reduce((acc, challenge) => {
    const category = challenge.type === 'group' ? 'group' : 'solo';
    if (!acc[category]) acc[category] = [];
    acc[category].push(challenge);
    return acc;
  }, {} as Record<string, CommunityChallenge[]>);

  const trendingChallenges = challenges?.filter(getTrendingStatus) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Community Challenges
          </CardTitle>
          <CardDescription>Join forces with the community to achieve amazing goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="enhanced-challenges">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Community Challenges
              </CardTitle>
              <CardDescription>
                Join forces with the community or take on solo challenges to earn rewards
              </CardDescription>
            </div>
            <Button variant="outline">
              <Award className="w-4 h-4 mr-2" />
              Create Challenge
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="trending" className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="group" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Group
              </TabsTrigger>
              <TabsTrigger value="solo" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Solo
              </TabsTrigger>
            </TabsList>

            {/* All Challenges */}
            <TabsContent value="all" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges?.map((challenge, index) => {
                  const colors = getChallengeTypeColor(challenge.type);
                  const daysLeft = getDaysLeft(challenge.endDate.toString());
                  const progress = getProgressPercentage(challenge.currentAmount || "0", challenge.targetAmount);
                  const difficulty = getDifficulty(challenge.targetAmount);
                  const isTrending = getTrendingStatus(challenge);
                  
                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="relative"
                    >
                      <Card 
                        className={`${colors.bg} ${colors.border} border-2 hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden relative`}
                        data-testid={`challenge-card-${challenge.id}`}
                      >
                        {/* Trending Badge */}
                        {isTrending && (
                          <div className="absolute top-3 right-3 z-10">
                            <Badge className="bg-red-500 text-white shadow-lg">
                              <Flame className="w-3 h-3 mr-1" />
                              Trending
                            </Badge>
                          </div>
                        )}

                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent pointer-events-none" />

                        <CardContent className="p-6 relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md`}>
                                {challenge.type === 'group' ? 
                                  <Users className={`w-5 h-5 ${colors.icon}`} /> :
                                  <UserCheck className={`w-5 h-5 ${colors.icon}`} />
                                }
                              </div>
                              <div>
                                <h3 className="font-bold text-lg" data-testid={`challenge-name-${challenge.id}`}>
                                  {challenge.name}
                                </h3>
                                <Badge className={colors.badge} data-testid={`challenge-type-${challenge.id}`}>
                                  {challenge.type === 'group' ? 'Group Challenge' : 'Solo Challenge'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground mb-4" data-testid={`challenge-description-${challenge.id}`}>
                            {challenge.description}
                          </p>

                          {/* Progress */}
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{progress.toFixed(1)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>${parseFloat(challenge.currentAmount || "0").toLocaleString()} raised</span>
                              <span>${parseFloat(challenge.targetAmount).toLocaleString()} target</span>
                            </div>
                          </div>

                          {/* Challenge Stats */}
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{daysLeft} days left</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={difficulty.color}>{difficulty.icon}</span>
                              <span>{difficulty.level}</span>
                            </div>
                          </div>

                          {/* Reward */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm font-medium">Reward</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {challenge.reward}
                            </p>
                          </div>

                          {/* Participants Preview */}
                          {challenge.type === 'group' && (
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex -space-x-2">
                                {Array.from({ length: Math.min(4, Math.floor(progress / 10) + 1) }).map((_, i) => (
                                  <div 
                                    key={i}
                                    className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full border-2 border-card"
                                  />
                                ))}
                                {progress > 30 && (
                                  <div className="w-6 h-6 bg-muted rounded-full border-2 border-card flex items-center justify-center text-xs">
                                    +{Math.floor(progress / 5)}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {Math.floor(progress / 5) + 1} participants
                              </span>
                            </div>
                          )}

                          {/* Join Button */}
                          <Button 
                            onClick={() => handleJoinChallenge(challenge)}
                            className="w-full group-hover:shadow-md transition-shadow"
                            data-testid={`button-join-${challenge.id}`}
                          >
                            <Trophy className="w-4 h-4 mr-2" />
                            Join Challenge
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Trending Challenges */}
            <TabsContent value="trending" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingChallenges.map((challenge, index) => {
                  const colors = getChallengeTypeColor(challenge.type);
                  const progress = getProgressPercentage(challenge.currentAmount || "0", challenge.targetAmount);
                  
                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      <Card className={`${colors.bg} ${colors.border} border-2 shadow-lg hover:shadow-xl transition-shadow`}>
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-red-500 text-white">
                            <Flame className="w-3 h-3 mr-1" />
                            Hot
                          </Badge>
                        </div>
                        <CardContent className="p-6">
                          <h3 className="font-bold text-lg mb-2">{challenge.name}</h3>
                          <Progress value={progress} className="mb-4" />
                          <Button 
                            onClick={() => handleJoinChallenge(challenge)}
                            className="w-full"
                          >
                            Join Trending Challenge
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Group Challenges */}
            <TabsContent value="group" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorizedChallenges?.group?.map((challenge, index) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 border-2">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-5 h-5 text-green-600" />
                          <h3 className="font-bold">{challenge.name}</h3>
                        </div>
                        <Progress 
                          value={getProgressPercentage(challenge.currentAmount || "0", challenge.targetAmount)} 
                          className="mb-4" 
                        />
                        <Button 
                          onClick={() => handleJoinChallenge(challenge)}
                          className="w-full"
                        >
                          Join Team
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Solo Challenges */}
            <TabsContent value="solo" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categorizedChallenges?.solo?.map((challenge, index) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800 border-2">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <UserCheck className="w-5 h-5 text-blue-600" />
                          <h3 className="font-bold">{challenge.name}</h3>
                        </div>
                        <Progress 
                          value={getProgressPercentage(challenge.currentAmount || "0", challenge.targetAmount)} 
                          className="mb-4" 
                        />
                        <Button 
                          onClick={() => handleJoinChallenge(challenge)}
                          className="w-full"
                        >
                          Take Challenge
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ChallengeWizard
        challenge={selectedChallenge}
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </>
  );
}