import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { CommunityChallenge } from "@shared/schema";

export function CommunityChalllenges() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: challenges, isLoading } = useQuery<CommunityChallenge[]>({
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
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to Join Challenge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
    joinChallengeMutation.mutate({ challengeId, contributedAmount: "1000" });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Community Challenges</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-12 bg-muted rounded mb-4"></div>
              <div className="h-2 bg-muted rounded mb-4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Community Challenges</h2>
        <Button variant="default" className="bg-accent hover:bg-accent/90" data-testid="button-create-challenge">
          Create Challenge
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {challenges?.map((challenge) => {
          const progress = calculateProgress(challenge.currentAmount || '0', challenge.targetAmount);
          return (
            <Card key={challenge.id} className="p-6 hover-lift" data-testid={`card-challenge-${challenge.id}`}>
              <div className="flex items-center justify-between mb-4">
                <Badge className={challenge.type === 'group' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}>
                  {challenge.status}
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
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span className="font-medium" data-testid={`text-challenge-progress-${challenge.id}`}>
                    ${parseFloat(challenge.currentAmount || '0').toLocaleString()} / ${parseFloat(challenge.targetAmount).toLocaleString()}
                  </span>
                </div>
                <Progress value={progress} className="h-2" data-testid={`progress-challenge-${challenge.id}`} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full border-2 border-card"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full border-2 border-card"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full border-2 border-card"></div>
                  <div className="w-8 h-8 bg-muted rounded-full border-2 border-card flex items-center justify-center text-xs">+5</div>
                </div>
                <Button 
                  size="sm"
                  onClick={() => handleJoinChallenge(challenge.id)}
                  disabled={joinChallengeMutation.isPending}
                  data-testid={`button-join-challenge-${challenge.id}`}
                >
                  {joinChallengeMutation.isPending ? "Joining..." : "Join Challenge"}
                </Button>
              </div>
            </Card>
          );
        }) || []}
      </div>
    </div>
  );
}
