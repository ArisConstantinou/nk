import {useEffect, useState} from 'react';
import type {MotionPreference} from '../core/types';

const readMotionPreference = (): MotionPreference => {
  if (typeof window === 'undefined') return 'reduced';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
};

export function useMotionPreference() {
  const [preference, setPreference] = useState<MotionPreference>(readMotionPreference);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPreference(media.matches ? 'reduced' : 'full');
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  return preference;
}
