export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function isDemoMode(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';
}