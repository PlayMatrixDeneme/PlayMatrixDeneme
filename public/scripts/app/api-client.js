import { userProfile } from '../data/home-data.js';

export async function loadBootstrap() {
  try {
    const response = await fetch('/api/home/bootstrap', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('bootstrap_failed');
    const payload = await response.json();
    if (payload?.ok && payload.user) return { ...userProfile, ...payload.user };
  } catch {}
  return userProfile;
}
