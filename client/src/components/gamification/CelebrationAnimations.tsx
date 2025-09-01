import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Zap, TrendingUp } from "lucide-react";

interface CelebrationProps {
  trigger: boolean;
  type: "investment" | "achievement" | "milestone" | "streak";
  message?: string;
  onComplete?: () => void;
}

export function CelebrationAnimation({ trigger, type, message, onComplete }: CelebrationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  const getAnimationConfig = () => {
    switch (type) {
      case "investment":
        return {
          icon: <TrendingUp className="w-8 h-8" />,
          color: "text-green-500",
          bg: "bg-green-50 dark:bg-green-950",
          border: "border-green-200 dark:border-green-800"
        };
      case "achievement":
        return {
          icon: <Trophy className="w-8 h-8" />,
          color: "text-yellow-500",
          bg: "bg-yellow-50 dark:bg-yellow-950",
          border: "border-yellow-200 dark:border-yellow-800"
        };
      case "milestone":
        return {
          icon: <Star className="w-8 h-8" />,
          color: "text-purple-500",
          bg: "bg-purple-50 dark:bg-purple-950",
          border: "border-purple-200 dark:border-purple-800"
        };
      case "streak":
        return {
          icon: <Zap className="w-8 h-8" />,
          color: "text-orange-500",
          bg: "bg-orange-50 dark:bg-orange-950",
          border: "border-orange-200 dark:border-orange-800"
        };
      default:
        return {
          icon: <Star className="w-8 h-8" />,
          color: "text-blue-500",
          bg: "bg-blue-50 dark:bg-blue-950",
          border: "border-blue-200 dark:border-blue-800"
        };
    }
  };

  const config = getAnimationConfig();

  // Confetti particles
  const confettiParticles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="celebration-animation"
        >
          {/* Confetti Background */}
          <div className="absolute inset-0">
            {confettiParticles.map((i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full"
                initial={{
                  x: "50vw",
                  y: "50vh",
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 100}vw`,
                  y: `${50 + (Math.random() - 0.5) * 100}vh`,
                  scale: [0, 1, 0],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Main Celebration Card */}
          <motion.div
            className={`pointer-events-auto max-w-sm mx-4 p-6 rounded-xl border-2 shadow-2xl ${config.bg} ${config.border}`}
            initial={{ scale: 0, rotate: -10 }}
            animate={{ 
              scale: [0, 1.1, 1],
              rotate: [0, 5, 0],
            }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ 
              duration: 0.6,
              ease: "easeOut",
              times: [0, 0.6, 1]
            }}
          >
            <div className="text-center">
              <motion.div
                className={`inline-block p-3 rounded-full ${config.color} mb-4`}
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 360]
                }}
                transition={{ 
                  duration: 1,
                  repeat: 2,
                  ease: "easeInOut"
                }}
              >
                {config.icon}
              </motion.div>
              
              <motion.h3
                className="text-xl font-bold mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                🎉 Congratulations!
              </motion.h3>
              
              <motion.p
                className="text-muted-foreground"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {message || "You've achieved something awesome!"}
              </motion.p>
            </div>
          </motion.div>

          {/* Floating Elements */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`float-${i}`}
              className="absolute text-2xl"
              initial={{
                x: "50vw",
                y: "50vh",
                opacity: 0,
              }}
              animate={{
                x: `${40 + Math.random() * 20}vw`,
                y: `${30 + Math.random() * 40}vh`,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                ease: "easeOut",
              }}
            >
              {["🎉", "✨", "🚀", "💎", "🏆", "⭐"][i]}
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}