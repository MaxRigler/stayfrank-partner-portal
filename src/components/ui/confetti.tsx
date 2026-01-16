import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  // Fire multiple bursts for a "raining" effect from the top
  const defaults = {
    spread: 160,
    ticks: 200,
    gravity: 1.2,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#ffffff'],
  };

  // First burst - center
  confetti({
    ...defaults,
    particleCount: 80,
    origin: { x: 0.5, y: 0.1 },
  });

  // Second burst - left side (delayed)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 50,
      origin: { x: 0.3, y: 0.05 },
    });
  }, 150);

  // Third burst - right side (delayed)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 50,
      origin: { x: 0.7, y: 0.05 },
    });
  }, 300);
};
