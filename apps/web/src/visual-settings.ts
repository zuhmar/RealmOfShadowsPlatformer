const key = 'ros-reduced-effects';
let reduced = false;
try {
  const saved = localStorage.getItem(key);
  reduced =
    saved === 'true' || (saved === null && matchMedia('(prefers-reduced-motion: reduce)').matches);
} catch {}
export const reducedEffects = () => reduced;
export function setReducedEffects(value: boolean) {
  reduced = value;
  try {
    localStorage.setItem(key, String(value));
  } catch {}
  document.documentElement.classList.toggle('reduced-effects', value);
}
setReducedEffects(reduced);
