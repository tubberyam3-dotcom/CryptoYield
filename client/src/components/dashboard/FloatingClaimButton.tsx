import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function FloatingClaimButton() {
  const [showFlames, setShowFlames] = useState(false);
  const { toast } = useToast();

  const { data: rewardStatus } = useQuery<{ canClaim: boolean; nextClaimTime: string | null }>({
    queryKey: ["/api/rewards/daily-status"],
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/rewards/claim-daily", "POST", {});
      return response;
    },
    onSuccess: (data: any) => {
      setShowFlames(true);
      setTimeout(() => setShowFlames(false), 2000);
      
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/daily-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "🎉 Daily Reward Claimed!",
        description: `You received $${data.rewardAmount}! Come back tomorrow for more.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cannot Claim Reward",
        description: error.message || "You can only claim once per day.",
        variant: "destructive",
      });
    },
  });

  const handleClaim = () => {
    if (rewardStatus?.canClaim) {
      claimMutation.mutate();
    }
  };

  if (!rewardStatus?.canClaim) {
    return null;
  }

  return (
    <motion.button
      onClick={handleClaim}
      disabled={claimMutation.isPending}
      className="fixed bottom-24 right-6 z-50 lg:hidden"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      data-testid="button-claim-daily-reward"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-full blur-xl opacity-75 animate-pulse"></div>
        
        <motion.div
          className="relative bg-gradient-to-br from-orange-500 via-red-600 to-pink-600 p-4 rounded-full shadow-2xl"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Rocket className="w-8 h-8 text-white" strokeWidth={2.5} />
        </motion.div>

        {showFlames && (
          <motion.div
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <div className="flex space-x-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-full"
                  animate={{
                    scaleY: [1, 1.5, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {claimMutation.isPending && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          </motion.div>
        )}

        <motion.div
          className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-lg"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          CLAIM
        </motion.div>
      </div>
    </motion.button>
  );
}
