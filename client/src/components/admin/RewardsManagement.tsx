import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Gift, Star, DollarSign, Users, TrendingUp, Calendar, Settings } from "lucide-react";
import { useState } from "react";

interface RewardStats {
  totalDailyBonusesClaimed: number;
  totalDailyBonusAmount: string;
  totalXpClaimed: number;
  totalXpConverted: number;
  activeDailyClaimers: number;
}

interface UserRewardInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  xpBalance: string;
  dailyBonusBalance: string;
  accumulatedDailyBonus: string;
  lastDailyRewardClaim: string | null;
}

export function RewardsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dailyBonusAmount, setDailyBonusAmount] = useState("100");
  const [xpPerClaim, setXpPerClaim] = useState("50");

  const { data: rewardStats, isLoading: statsLoading } = useQuery<RewardStats>({
    queryKey: ["/api/admin/rewards/stats"],
  });

  const { data: topRewardUsers, isLoading: usersLoading } = useQuery<UserRewardInfo[]>({
    queryKey: ["/api/admin/rewards/top-users"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: { dailyBonusAmount: string; xpPerClaim: string }) => {
      const response = await apiRequest("PATCH", "/api/admin/rewards/settings", settings);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Reward settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rewards"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = statsLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading rewards data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  ${parseFloat(rewardStats?.totalDailyBonusAmount || '0').toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total Bonuses Claimed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {(rewardStats?.totalXpClaimed || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total XP Claimed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {(rewardStats?.totalXpConverted || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">XP Converted to Cash</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {rewardStats?.activeDailyClaimers || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active Daily Claimers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Reward Settings
            </CardTitle>
            <CardDescription>Configure daily bonus and XP reward amounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dailyBonus">Daily Bonus Amount ($)</Label>
              <Input
                id="dailyBonus"
                type="number"
                value={dailyBonusAmount}
                onChange={(e) => setDailyBonusAmount(e.target.value)}
                placeholder="100"
                data-testid="input-daily-bonus-amount"
              />
              <p className="text-xs text-muted-foreground">
                Amount users receive when claiming daily bonus
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="xpPerClaim">XP Per Daily Claim</Label>
              <Input
                id="xpPerClaim"
                type="number"
                value={xpPerClaim}
                onChange={(e) => setXpPerClaim(e.target.value)}
                placeholder="50"
                data-testid="input-xp-per-claim"
              />
              <p className="text-xs text-muted-foreground">
                XP points awarded for each daily claim
              </p>
            </div>

            <Button
              onClick={() => updateSettingsMutation.mutate({ dailyBonusAmount, xpPerClaim })}
              disabled={updateSettingsMutation.isPending}
              className="w-full"
              data-testid="button-save-reward-settings"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Top Reward Earners
            </CardTitle>
            <CardDescription>Users with highest XP and bonus balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRewardUsers && topRewardUsers.length > 0 ? (
                topRewardUsers.slice(0, 5).map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium text-purple-600">
                        <Star className="w-3 h-3" />
                        {parseFloat(user.xpBalance || '0').toLocaleString()} XP
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <DollarSign className="w-3 h-3" />
                        ${parseFloat(user.dailyBonusBalance || '0').toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No reward data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reward System Overview
          </CardTitle>
          <CardDescription>Current reward mechanics and conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Daily Bonus</h4>
              <p className="text-2xl font-bold text-green-600">$100</p>
              <p className="text-xs text-muted-foreground mt-1">
                Users can claim once every 24 hours
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Daily XP Reward</h4>
              <p className="text-2xl font-bold text-purple-600">50 XP</p>
              <p className="text-xs text-muted-foreground mt-1">
                Earned with each daily claim
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">XP Conversion Rate</h4>
              <p className="text-2xl font-bold text-blue-600">100:1</p>
              <p className="text-xs text-muted-foreground mt-1">
                100 XP = $1.00 when converted
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
