import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Gift, TrendingUp, Calendar, CheckCircle2, Clock, Ticket, Zap, ArrowRightLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { DailyBonus, User } from "@shared/schema";

interface DailyBonusHistory {
  bonuses: DailyBonus[];
  stats: {
    totalClaimed: string;
    totalRedeemed: string;
    pending: string;
    lastClaimDate: Date | null;
  };
}

export default function RewardsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [xpToConvert, setXpToConvert] = useState("");
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const { data: history, isLoading } = useQuery<DailyBonusHistory>({
    queryKey: ['/api/rewards/daily-history'],
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/rewards/redeem', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/daily-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success!",
        description: `Redeemed $${parseFloat(data.redeemedAmount).toFixed(2)} to your balance!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem rewards",
        variant: "destructive",
      });
    },
  });

  const couponMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest('POST', '/api/rewards/redeem-coupon', { code });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "🎉 Coupon Redeemed!",
        description: `${data.message} +$${parseFloat(data.rewardAmount).toFixed(2)} added to your balance!`,
      });
      setCouponCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Coupon",
        description: error.message || "Failed to redeem coupon",
        variant: "destructive",
      });
    },
  });

  const handleRedeem = () => {
    redeemMutation.mutate();
  };

  const handleCouponRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.trim()) {
      couponMutation.mutate(couponCode.trim());
    }
  };

  const claimXpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/xp/claim', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/xp/history'] });
      toast({
        title: "✨ XP Claimed!",
        description: `+${data.xpAmount} XP added to your balance!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim XP",
        variant: "destructive",
      });
    },
  });

  const convertXpMutation = useMutation({
    mutationFn: async (xpAmount: number) => {
      return await apiRequest('POST', '/api/xp/convert', { xpAmount });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/xp/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: "💰 XP Converted!",
        description: `Converted to $${parseFloat(data.convertedAmount).toFixed(2)}!`,
      });
      setXpToConvert("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert XP",
        variant: "destructive",
      });
    },
  });

  const handleXpConvert = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(xpToConvert);
    if (amount && amount > 0) {
      convertXpMutation.mutate(amount);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bonus history...</p>
        </div>
      </div>
    );
  }

  const stats = history?.stats || {
    totalClaimed: '0',
    totalRedeemed: '0',
    pending: '0',
    lastClaimDate: null,
  };

  const bonuses = history?.bonuses || [];
  const pendingAmount = parseFloat(stats?.pending || '0');
  const canRedeem = pendingAmount > 0 && !redeemMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar title="Rewards" onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
      
      <main className="lg:ml-64 pt-16">
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-4 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2" data-testid="heading-rewards">
              Rewards
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Track your daily rewards and redeem them for cash
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-6 md:grid-cols-3 mb-4 md:mb-8">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-1.5 md:gap-2">
                  <Gift className="h-3 w-3 md:h-4 md:w-4" />
                  Pending Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-2xl md:text-3xl font-bold text-amber-950 dark:text-amber-50" data-testid="text-pending-amount">
                  ${pendingAmount.toFixed(2)}
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 md:mt-1">
                  Ready to redeem
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                  Total Claimed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-2xl md:text-3xl font-bold" data-testid="text-total-claimed">
                  ${parseFloat(stats.totalClaimed).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 md:mt-1">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2">
                  <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" />
                  Total Redeemed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-2xl md:text-3xl font-bold" data-testid="text-total-redeemed">
                  ${parseFloat(stats.totalRedeemed).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 md:mt-1">
                  Converted to cash
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-4 md:mb-8">
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
                <div>
                  <CardTitle className="text-base md:text-lg">Redeem Your Rewards</CardTitle>
                  <CardDescription className="mt-1 text-xs md:text-sm">
                    Convert your accumulated rewards to cash balance
                  </CardDescription>
                </div>
                <Button
                  onClick={handleRedeem}
                  disabled={!canRedeem || redeemMutation.isPending}
                  size="default"
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 w-full md:w-auto"
                  data-testid="button-redeem-rewards"
                >
                  {redeemMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Redeeming...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Redeem ${pendingAmount.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="mb-4 md:mb-8">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-base md:text-lg">Daily XP Rewards</CardTitle>
              </div>
              <CardDescription className="text-xs md:text-sm">
                Claim 50 XP daily and convert them to cash (conversion rate set by admin)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Your XP Balance</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-xp-balance">
                    {user?.xpBalance || 0} XP
                  </p>
                </div>
                <Button
                  onClick={() => claimXpMutation.mutate()}
                  disabled={claimXpMutation.isPending}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
                  data-testid="button-claim-xp"
                >
                  {claimXpMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Claim 50 XP
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Convert XP to Cash</p>
                <form onSubmit={handleXpConvert} className="flex flex-col md:flex-row gap-3">
                  <Input
                    type="number"
                    placeholder="Enter XP amount"
                    value={xpToConvert}
                    onChange={(e) => setXpToConvert(e.target.value)}
                    min="1"
                    max={user?.xpBalance || 0}
                    className="flex-1"
                    data-testid="input-xp-amount"
                    disabled={convertXpMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!xpToConvert || parseInt(xpToConvert) <= 0 || convertXpMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 w-full md:w-auto"
                    data-testid="button-convert-xp"
                  >
                    {convertXpMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Converting...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Convert to Cash
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4 md:mb-8">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="h-5 w-5 text-primary" />
                <CardTitle className="text-base md:text-lg">Have a Coupon Code?</CardTitle>
              </div>
              <CardDescription className="text-xs md:text-sm">
                Enter your promotional code to receive instant rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <form onSubmit={handleCouponRedeem} className="flex flex-col md:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 uppercase"
                  data-testid="input-coupon-code"
                  disabled={couponMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={!couponCode.trim() || couponMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 w-full md:w-auto"
                  data-testid="button-redeem-coupon"
                >
                  {couponMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Redeeming...
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4 mr-2" />
                      Redeem Coupon
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Reward History</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                All your reward claims and redemptions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              {bonuses.length === 0 ? (
                <div className="text-center py-8 md:py-12" data-testid="empty-state">
                  <Gift className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4 opacity-50" />
                  <p className="text-sm md:text-base text-muted-foreground">No bonus claims yet</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">
                    Visit the dashboard to claim your first daily bonus
                  </p>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {bonuses.map((bonus) => (
                    <div
                      key={bonus.id}
                      className="flex items-center justify-between p-3 md:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      data-testid={`bonus-item-${bonus.id}`}
                    >
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className={`p-1.5 md:p-2 rounded-full ${
                          bonus.status === 'redeemed' 
                            ? 'bg-green-100 dark:bg-green-900' 
                            : 'bg-amber-100 dark:bg-amber-900'
                        }`}>
                          {bonus.status === 'redeemed' ? (
                            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Clock className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm md:text-base font-semibold" data-testid={`text-bonus-amount-${bonus.id}`}>
                            ${parseFloat(bonus.amount).toFixed(2)}
                          </div>
                          <div className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 md:gap-2">
                            <Calendar className="h-3 w-3" />
                            Claimed: {bonus.claimedAt ? format(new Date(bonus.claimedAt), 'MMM dd, yyyy') : 'Unknown'}
                          </div>
                          {bonus.redeemedAt && (
                            <div className="text-xs text-muted-foreground mt-0.5 md:mt-1">
                              Redeemed: {format(new Date(bonus.redeemedAt), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={bonus.status === 'redeemed' ? 'default' : 'secondary'}
                        className="text-xs"
                        data-testid={`badge-status-${bonus.id}`}
                      >
                        {bonus.status === 'redeemed' ? 'Redeemed' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
