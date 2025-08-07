import React, { useEffect, useState } from 'react';
import { X, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DailyRewardPopupProps {
  isVisible: boolean;
  tokens: number;
  onClose: () => void;
}

// Confetti particle component
const ConfettiParticle = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full"
    style={{
      background: `hsl(${Math.random() * 60 + 45}, 70%, 60%)`, // Random gold/yellow colors
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }}
    initial={{ opacity: 1, scale: 1, y: 0 }}
    animate={{
      opacity: 0,
      scale: 0,
      y: Math.random() * 200 - 100,
      x: Math.random() * 200 - 100,
      rotate: Math.random() * 720,
    }}
    transition={{
      duration: 1.5 + Math.random() * 0.5,
      delay: delay,
      ease: "easeOut",
    }}
  />
);

export default function DailyRewardPopup({ isVisible, tokens, onClose }: DailyRewardPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 50 }).map((_, i) => (
                <ConfettiParticle key={i} delay={i * 0.05} />
              ))}
            </div>
          )}

          {/* Popup Card */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.6
            }}
            className="relative m-4"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-900/20 dark:to-yellow-900/20 border-2 border-green-300 dark:border-green-600 shadow-2xl min-w-[320px] max-w-md">
              {/* Animated Background Glow */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-yellow-400/20 to-green-400/20"
                animate={{ 
                  background: [
                    "linear-gradient(45deg, rgba(34, 197, 94, 0.2), rgba(250, 204, 21, 0.2), rgba(34, 197, 94, 0.2))",
                    "linear-gradient(225deg, rgba(250, 204, 21, 0.2), rgba(34, 197, 94, 0.2), rgba(250, 204, 21, 0.2))",
                    "linear-gradient(45deg, rgba(34, 197, 94, 0.2), rgba(250, 204, 21, 0.2), rgba(34, 197, 94, 0.2))"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-2 right-2 z-10 hover:bg-white/20 dark:hover:bg-black/20"
              >
                <X className="h-4 w-4" />
              </Button>

              <CardContent className="relative p-6 text-center space-y-4">
                {/* Animated Coin Icon */}
                <motion.div
                  animate={{ 
                    rotateY: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotateY: { duration: 2, repeat: Infinity, ease: "linear" },
                    scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="flex justify-center mb-4"
                >
                  <div className="relative">
                    <Coins className="h-16 w-16 text-yellow-500 drop-shadow-lg" />
                    {/* Pulse Ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-yellow-400"
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [1, 0, 1]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    />
                  </div>
                </motion.div>

                {/* Title with Celebration Emoji */}
                <motion.h2 
                  className="text-2xl font-bold text-green-700 dark:text-green-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  🎉 Daily Login Reward!
                </motion.h2>

                {/* Token Amount */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", damping: 15 }}
                  className="bg-gradient-to-r from-yellow-200 to-green-200 dark:from-yellow-800/50 dark:to-green-800/50 rounded-lg p-4 border border-yellow-300 dark:border-yellow-600"
                >
                  <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                    +{tokens.toLocaleString()} Tokens
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Added to your balance
                  </div>
                </motion.div>

                {/* Message */}
                <motion.p 
                  className="text-green-600 dark:text-green-400 font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  You earned {tokens} tokens for your first login today!
                </motion.p>

                {/* Progress indicator */}
                <motion.div 
                  className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <motion.div 
                    className="bg-gradient-to-r from-green-500 to-yellow-500 h-1 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 1, duration: 3, ease: "linear" }}
                  />
                </motion.div>

                {/* Auto-dismiss text */}
                <motion.p 
                  className="text-xs text-gray-500 dark:text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  Auto-closing in a few seconds...
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}