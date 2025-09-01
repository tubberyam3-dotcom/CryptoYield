import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { CommunityChallenge } from "@shared/schema";

export default function Challenges() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contributionAmount, setContributionAmount] = useState("");
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    name: "",
    description: "",
    targetAmount: "",
    type: "group" as "solo" | "group",
    endDate: "",
    reward: "",
  });
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: challenges, isLoading: challengesLoading } = useQuery<CommunityChallenge[]>({
    queryKey: ["/api/challenges"],
  });

  const joinChallengeMutation = useMutation({
    mutationFn: async ({ challengeId, contributedAmount }: { challengeId: string; contributedAmount: string }) => {
      const response = await apiRequest("POST", `/api/challenges/${challengeId}/join`, { contributedAmount });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge Joined",
        description: "You've successfully joined the challenge!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setContributionAmount("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to Join Challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (challengeData: any) => {
      const response = await apiRequest("POST", "/api/challenges", challengeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Challenge Created",
        description: "Your challenge has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setCreateChallengeOpen(false);
      setNewChallenge({
        name: "",
        description: "",
        targetAmount: "",
        type: "group",
        endDate: "",
        reward: "",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Failed to Create Challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Authentication is handled by App component routing

  const calculateProgress = (current: string, target: string) => {
    const currentAmount = parseFloat(current);
    const targetAmount = parseFloat(target);
    return Math.min((currentAmount / targetAmount) * 100, 100);
  };

  const formatTimeLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `${diffDays} days left`;
    } else {
      return "Expired";
    }
  };

  const handleJoinChallenge = (challengeId: string) => {
    const amount = contributionAmount || "1000";
    joinChallengeMutation.mutate({ challengeId, contributedAmount: amount });
  };

  const handleCreateChallenge = () => {
    const endDate = new Date(newChallenge.endDate);
    createChallengeMutation.mutate({
      ...newChallenge,
      endDate: endDate.toISOString(),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="challenges-page">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="ml-0 lg:ml-64 min-h-screen">
        <TopBar title="Community Challenges" onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="p-6 space-y-6 pb-20 lg:pb-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Community Challenges</h2>
              <p className="text-muted-foreground">Join investment challenges and achieve goals together</p>
            </div>
            
            <Dialog open={createChallengeOpen} onOpenChange={setCreateChallengeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90" data-testid="button-create-challenge">
                  <i className="fas fa-plus mr-2"></i>
                  Create Challenge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" data-testid="dialog-create-challenge">
                <DialogHeader>
                  <DialogTitle>Create New Challenge</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="challengeName">Challenge Name</Label>
                    <Input
                      id="challengeName"
                      placeholder="Enter challenge name"
                      value={newChallenge.name}
                      onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
                      data-testid="input-challenge-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="challengeDescription">Description</Label>
                    <Textarea
                      id="challengeDescription"
                      placeholder="Describe your challenge"
                      value={newChallenge.description}
                      onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                      data-testid="textarea-challenge-description"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="targetAmount">Target Amount ($)</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      placeholder="10000"
                      value={newChallenge.targetAmount}
                      onChange={(e) => setNewChallenge({ ...newChallenge, targetAmount: e.target.value })}
                      data-testid="input-target-amount"
                    />
                  </div>
                  
                  <div>
                    <Label>Challenge Type</Label>
                    <Select value={newChallenge.type} onValueChange={(value: "solo" | "group") => setNewChallenge({ ...newChallenge, type: value })}>
                      <SelectTrigger data-testid="select-challenge-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">Group Challenge</SelectItem>
                        <SelectItem value="solo">Solo Challenge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newChallenge.endDate}
                      onChange={(e) => setNewChallenge({ ...newChallenge, endDate: e.target.value })}
                      data-testid="input-end-date"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reward">Reward (Optional)</Label>
                    <Input
                      id="reward"
                      placeholder="e.g., $100 bonus, Premium badge"
                      value={newChallenge.reward}
                      onChange={(e) => setNewChallenge({ ...newChallenge, reward: e.target.value })}
                      data-testid="input-reward"
                    />
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={handleCreateChallenge}
                    disabled={createChallengeMutation.isPending || !newChallenge.name || !newChallenge.targetAmount || !newChallenge.endDate}
                    data-testid="button-confirm-create-challenge"
                  >
                    {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Active Challenges */}
          {challengesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-12 bg-muted rounded mb-4"></div>
                  <div className="h-2 bg-muted rounded mb-4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {challenges?.map((challenge) => {
                const progress = calculateProgress(challenge.currentAmount || '0', challenge.targetAmount);
                return (
                  <Card key={challenge.id} className="p-6 hover-lift" data-testid={`card-challenge-${challenge.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={
                        challenge.type === 'group' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-blue-500/10 text-blue-500'
                      }>
                        {challenge.type} • {challenge.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground" data-testid={`text-challenge-time-${challenge.id}`}>
                        {formatTimeLeft(challenge.endDate.toString())}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2" data-testid={`text-challenge-name-${challenge.id}`}>
                      {challenge.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4" data-testid={`text-challenge-description-${challenge.id}`}>
                      {challenge.description}
                    </p>
                    
                    {challenge.reward && (
                      <div className="mb-4">
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10">
                          <i className="fas fa-gift mr-1"></i>
                          {challenge.reward}
                        </Badge>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span className="font-medium" data-testid={`text-challenge-progress-${challenge.id}`}>
                          ${parseFloat(challenge.currentAmount || '0').toLocaleString()} / ${parseFloat(challenge.targetAmount).toLocaleString()}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" data-testid={`progress-challenge-${challenge.id}`} />
                      <div className="text-xs text-muted-foreground mt-1">
                        {progress.toFixed(1)}% complete
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full border-2 border-card"></div>
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full border-2 border-card"></div>
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-card"></div>
                        <div className="w-8 h-8 bg-muted rounded-full border-2 border-card flex items-center justify-center text-xs">+12</div>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            disabled={challenge.status !== 'active'}
                            data-testid={`button-join-challenge-${challenge.id}`}
                          >
                            {challenge.status === 'active' ? 'Join Challenge' : 'Ended'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent data-testid="dialog-join-challenge">
                          <DialogHeader>
                            <DialogTitle>Join {challenge.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                              <div className="flex justify-between mb-2">
                                <span>Target</span>
                                <span className="font-bold">${parseFloat(challenge.targetAmount).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between mb-2">
                                <span>Current</span>
                                <span>${parseFloat(challenge.currentAmount || '0').toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Type</span>
                                <Badge variant="outline">{challenge.type}</Badge>
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="contributionAmount">Your Contribution ($)</Label>
                              <Input
                                id="contributionAmount"
                                type="number"
                                placeholder="1000"
                                value={contributionAmount}
                                onChange={(e) => setContributionAmount(e.target.value)}
                                data-testid="input-contribution-amount"
                              />
                            </div>
                            
                            <Button 
                              className="w-full"
                              onClick={() => handleJoinChallenge(challenge.id)}
                              disabled={joinChallengeMutation.isPending}
                              data-testid="button-confirm-join-challenge"
                            >
                              {joinChallengeMutation.isPending ? "Joining..." : "Join Challenge"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </Card>
                );
              }) || []}
            </div>
          )}

          {/* Challenge Types Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6" data-testid="card-group-challenges-info">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-green-500 text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold">Group Challenges</h3>
                  <p className="text-sm text-muted-foreground">Collaborate with the community</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Join forces with other investors to reach collective investment goals. 
                Share rewards and celebrate achievements together.
              </p>
            </Card>

            <Card className="p-6" data-testid="card-solo-challenges-info">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-user text-blue-500 text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold">Solo Challenges</h3>
                  <p className="text-sm text-muted-foreground">Personal investment milestones</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Set personal investment goals and track your progress. 
                Earn rewards for reaching your individual milestones.
              </p>
            </Card>
          </div>

        </main>
      </div>
      
      <MobileNav />
    </div>
  );
}
