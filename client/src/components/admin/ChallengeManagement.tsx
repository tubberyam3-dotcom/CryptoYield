import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CommunityChallenge } from "@shared/schema";
import { format } from "date-fns";

interface ChallengeDetails {
  challenge: CommunityChallenge;
  members: Array<{
    id: string;
    userId: string;
    contributedAmount: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
  memberCount: number;
  totalContributed: number;
}

export function ChallengeManagement() {
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [newChallenge, setNewChallenge] = useState({
    name: "",
    description: "",
    targetAmount: "",
    duration: "30",
    type: "group" as "solo" | "group",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch challenges
  const { data: challenges } = useQuery<CommunityChallenge[]>({
    queryKey: ["/api/admin/challenges"],
  });

  // Fetch challenge details
  const { data: challengeDetails } = useQuery<ChallengeDetails>({
    queryKey: ["/api/admin/challenges", selectedChallenge, "details"],
    enabled: !!selectedChallenge,
  });

  // Create challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (challengeData: any) => {
      const res = await apiRequest("POST", "/api/admin/challenges", challengeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/challenges"] });
      setCreateChallengeOpen(false);
      setNewChallenge({
        name: "",
        description: "",
        targetAmount: "",
        duration: "30",
        type: "group",
      });
      toast({
        title: "Challenge Created",
        description: "New challenge has been successfully created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    createChallengeMutation.mutate({
      ...newChallenge,
      targetAmount: newChallenge.targetAmount,
      endDate: new Date(Date.now() + parseInt(newChallenge.duration) * 24 * 60 * 60 * 1000),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'solo': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'group': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Challenge Management</h2>
          <p className="text-muted-foreground">Create and monitor community challenges</p>
        </div>
        <Dialog open={createChallengeOpen} onOpenChange={setCreateChallengeOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-challenge">
              <i className="fas fa-plus mr-2"></i>
              Create Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Challenge</DialogTitle>
              <DialogDescription>
                Set up a new community investment challenge
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Challenge Name</Label>
                <Input
                  id="name"
                  value={newChallenge.name}
                  onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
                  placeholder="e.g., Weekly Investment Sprint"
                  required
                  data-testid="input-challenge-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                  placeholder="Describe the challenge objectives and rules"
                  required
                  data-testid="textarea-challenge-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Target Amount ($)</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    value={newChallenge.targetAmount}
                    onChange={(e) => setNewChallenge({ ...newChallenge, targetAmount: e.target.value })}
                    placeholder="5000"
                    required
                    data-testid="input-challenge-target"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newChallenge.duration}
                    onChange={(e) => setNewChallenge({ ...newChallenge, duration: e.target.value })}
                    placeholder="30"
                    required
                    data-testid="input-challenge-duration"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="challengeType">Type</Label>
                  <Select 
                    value={newChallenge.challengeType} 
                    onValueChange={(value: "solo" | "group") => 
                      setNewChallenge({ ...newChallenge, challengeType: value })
                    }
                  >
                    <SelectTrigger data-testid="select-challenge-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo">Solo</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select 
                    value={newChallenge.difficulty} 
                    onValueChange={(value: "easy" | "medium" | "hard") => 
                      setNewChallenge({ ...newChallenge, difficulty: value })
                    }
                  >
                    <SelectTrigger data-testid="select-challenge-difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateChallengeOpen(false)}
                  className="flex-1"
                  data-testid="button-cancel-challenge"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createChallengeMutation.isPending}
                  data-testid="button-submit-challenge"
                >
                  {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Challenge Grid */}
      <div className="grid gap-6">
        {/* Challenge List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-list text-primary"></i>
              All Challenges
            </CardTitle>
            <CardDescription>
              Monitor and manage community challenges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challenges?.map((challenge) => (
                <div 
                  key={challenge.id} 
                  className={`p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                    selectedChallenge === challenge.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedChallenge(challenge.id)}
                  data-testid={`challenge-item-${challenge.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{challenge.name}</h3>
                        <Badge variant="outline" className={getStatusColor(challenge.status || 'active')}>
                          {challenge.status || 'active'}
                        </Badge>
                        <Badge variant="outline" className={getTypeColor(challenge.type)}>
                          {challenge.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Target:</span> ${parseFloat(challenge.targetAmount).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Current:</span> ${parseFloat(challenge.currentAmount || '0').toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {challenge.type}
                        </div>
                        <div>
                          <span className="font-medium">End Date:</span> {format(new Date(challenge.endDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Progress: {Math.round((parseFloat(challenge.currentAmount || '0') / parseFloat(challenge.targetAmount)) * 100)}%
                      </div>
                      <div className="w-20 bg-muted rounded-full h-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{
                            width: `${Math.min(100, (parseFloat(challenge.currentAmount || '0') / parseFloat(challenge.targetAmount)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-trophy text-4xl mb-4"></i>
                  <p>No challenges created yet</p>
                  <p className="text-sm">Create your first community challenge to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Challenge Details */}
        {selectedChallenge && challengeDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-info-circle text-blue-600"></i>
                Challenge Details
              </CardTitle>
              <CardDescription>
                Detailed view and member management for {challengeDetails.challenge.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Challenge Stats */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Challenge Statistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Members</div>
                      <div className="text-2xl font-bold">{challengeDetails.memberCount}</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Contributed</div>
                      <div className="text-2xl font-bold">${challengeDetails.totalContributed.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                    <div className="text-2xl font-bold">
                      {Math.round((challengeDetails.totalContributed / parseFloat(challengeDetails.challenge.targetAmount)) * 100)}%
                    </div>
                    <div className="w-full bg-background rounded-full h-2 mt-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{
                          width: `${Math.min(100, (challengeDetails.totalContributed / parseFloat(challengeDetails.challenge.targetAmount)) * 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Member List */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Challenge Members</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {challengeDetails.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{member.user.firstName} {member.user.lastName}</div>
                          <div className="text-sm text-muted-foreground">{member.user.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${parseFloat(member.contributedAmount).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">contributed</div>
                        </div>
                      </div>
                    ))}
                    {challengeDetails.members.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <i className="fas fa-users text-2xl mb-2"></i>
                        <p>No members yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}