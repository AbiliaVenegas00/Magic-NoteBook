import confetti from 'canvas-confetti';

export function fireGoalCompletionConfetti() {
  // Multiphase festive burst
  const end = Date.now() + 1.2 * 1000;
  const colors = ['#FF688B', '#FFD1DB', '#10B981', '#34D399', '#FBBF24', '#FFFFFF'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      origin: { x: 0.1, y: 0.7 },
      colors,
      zIndex: 99999,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      origin: { x: 0.9, y: 0.7 },
      colors,
      zIndex: 99999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  // Big center burst
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      zIndex: 99999,
    });
  }, 200);
}
