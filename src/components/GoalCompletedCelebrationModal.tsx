import React, { useEffect } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoalCompletedCelebrationModalProps {
  goalTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const GoalCompletedCelebrationModal: React.FC<GoalCompletedCelebrationModalProps> = ({
  goalTitle,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Optional audio sound effect (gentle pleasant chime with Web Audio API)
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + duration);
      };

      // Play joyful major chord arpeggio
      playTone(523.25, 0.0, 0.4); // C5
      playTone(659.25, 0.12, 0.4); // E5
      playTone(783.99, 0.24, 0.5); // G5
      playTone(1046.5, 0.36, 0.8); // C6
    } catch {
      // AudioContext might be blocked or unavailable, ignore gracefully
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Celebration Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="relative z-10 w-full max-w-md bg-gradient-to-b from-[#2F1E24] via-[#241A1D] to-[#1A1A1A] border-2 border-[#FF688B] rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(255,104,139,0.35)] text-center overflow-hidden"
          >
            {/* Ambient decorative glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#FF688B]/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#10B981]/25 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cerrar celebración"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Animated Trophy Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', damping: 14, stiffness: 250 }}
              className="relative inline-flex items-center justify-center mb-5"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#FF688B] to-[#FFD1DB] p-0.5 shadow-[0_10px_25px_rgba(255,104,139,0.45)]">
                <div className="w-full h-full bg-[#1F1F1F] rounded-[22px] flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-[#FFD1DB] fill-[#FF688B]/40 stroke-[2.2]" />
                </div>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-1 -right-1 text-amber-400"
              >
                <Sparkles className="w-6 h-6 fill-amber-400" />
              </motion.div>
            </motion.div>

            {/* Big Main Headline */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
              ¡Completaste toda la meta!
            </h2>

            {/* Target Goal Name Pill */}
            <div className="my-3 px-4 py-2 rounded-2xl bg-[#191919] border border-[#5C464B]/60 inline-block max-w-full">
              <p className="text-sm sm:text-base font-extrabold text-[#FFD1DB] truncate">
                {goalTitle}
              </p>
            </div>

            {/* Action Button */}
            <div className="mt-4">
              <button
                onClick={onClose}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#FF688B] to-[#FF99AA] hover:from-[#ff557c] hover:to-[#ff8aa0] text-[#1F1F1F] font-black text-sm tracking-wide shadow-lg shadow-[#FF688B]/30 hover:shadow-[#FF688B]/50 active:scale-98 transition-all"
              >
                ¡Genial!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
