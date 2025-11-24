import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export function FloatingClaimButton() {
  const [, setLocation] = useLocation();

  const { data: rewardStatus } = useQuery<{ canClaim: boolean; nextClaimTime: string | null }>({
    queryKey: ["/api/rewards/daily-status"],
  });

  const handleClick = () => {
    setLocation("/rewards");
  };

  if (!rewardStatus?.canClaim) {
    return null;
  }

  return (
    <motion.button
      onClick={handleClick}
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
