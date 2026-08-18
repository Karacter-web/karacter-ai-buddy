/**
 * Centralized Supabase configuration
 * Use this for consistent access to Supabase configuration across the app
 */

export const supabaseConfig = {
  // Project reference from supabase/config.toml or environment
  projectRef: 
    import.meta.env.VITE_SUPABASE_PROJECT_ID || 
    process.env.SUPABASE_PROJECT_ID || 
    'kcaemoljtmtcwvibxomc',
  
  // Client-side URLs and keys (exposed to browser)
  url: import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
  
  // Server-side only (never exposed to client)
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // OAuth providers
  oauth: {
    github: {
      enabled: true,
      scopes: ['user:email', 'read:user'],
    },
    google: {
      enabled: true,
      scopes: ['profile', 'email'],
    },
  },
  
  // Feature flags
  features: {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    storage: {
      useLocalStorage: typeof window !== 'undefined',
    },
  },
} as const;

export type SupabaseConfig = typeof supabaseConfig;

/**
 * Validate that required Supabase configuration is present
 */
export function validateSupabaseConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!supabaseConfig.url) missing.push('SUPABASE_URL');
  if (!supabaseConfig.publishableKey) missing.push('SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseConfig.serviceRoleKey && typeof window === 'undefined') {
    // Service role key only needed on server
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get error message for missing configuration
 */
export function getSupabaseConfigError(missing: string[]): string {
  if (typeof window !== 'undefined') {
    // Client-side
    return `Missing Supabase client configuration: ${missing.join(', ')}. ` +
           'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.';
  }
  // Server-side
  return `Missing Supabase server configuration: ${missing.join(', ')}. ` +
         'Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY in Cloudflare Worker secrets.';
}
