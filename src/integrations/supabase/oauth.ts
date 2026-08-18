/**
 * Supabase OAuth Integration
 * Handles GitHub and other OAuth providers via Supabase Auth
 */

import { supabase } from './client';
import { supabaseConfig } from './config';

export type OAuthProvider = 'github' | 'google' | 'gitlab' | 'bitbucket';

export interface OAuthConfig {
  provider: OAuthProvider;
  options?: {
    redirectTo?: string;
    queryParams?: Record<string, string>;
    scopes?: string[];
  };
}

/**
 * Default redirect URL for OAuth flows
 * In production, this should point to your deployed app
 */
export function getOAuthRedirectUrl(): string {
  // Try to get from environment first
  const envRedirect = import.meta.env.VITE_OAUTH_REDIRECT_URL || process.env.OAUTH_REDIRECT_URL;
  if (envRedirect) return envRedirect;
  
  // Fallback to current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Default for server-side
  return 'http://localhost:3000/auth/callback';
}

/**
 * Sign in with a specific OAuth provider
 */
export async function signInWithOAuth(provider: OAuthProvider, options?: OAuthConfig['options']): Promise<{ error: Error | null; url?: string }> {
  const redirectTo = getOAuthRedirectUrl();
  
  // Check if we're in an iframe - if so, we need to open in a new tab
  const inFrame = typeof window !== 'undefined' && window.self !== window.top;
  
  // Get provider-specific scopes from config
  const providerScopes = supabaseConfig.oauth[provider]?.scopes || [];
  
  // Build query params with scopes for providers that support it
  const queryParams: Record<string, string> = {
    ...options?.queryParams,
  };
  
  // For GitHub, Supabase uses the configured scopes in the Auth settings
  // We don't need to pass scopes here as they're configured in Supabase Dashboard
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: inFrame,
      queryParams,
    },
  });
  
  return { error, url: data?.url };
}

/**
 * Sign in specifically with GitHub
 */
export async function signInWithGitHub(options?: OAuthConfig['options']): Promise<{ error: Error | null; url?: string }> {
  // Add GitHub-specific scopes
  // Note: Supabase Auth has GitHub OAuth pre-configured with default scopes
  // To customize scopes, you must configure them in the Supabase Dashboard
  // under Authentication -> Providers -> GitHub
  
  return signInWithOAuth('github', {
    ...options,
    queryParams: {
      ...options?.queryParams,
      // GitHub scopes are configured in Supabase Dashboard, not here
      // Supabase Auth handles the OAuth flow internally
    },
  });
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(options?: OAuthConfig['options']): Promise<{ error: Error | null }> {
  return signInWithOAuth('google', options);
}

/**
 * Link an additional OAuth provider to an existing account
 */
export async function linkOAuthProvider(
  provider: OAuthProvider,
  accessToken: string,
): Promise<{ data: unknown; error: Error | null }> {
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    token: accessToken,
  });
  
  return { data, error };
}

/**
 * Unlink an OAuth provider from an account
 */
export async function unlinkOAuthProvider(provider: OAuthProvider): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.unlinkIdentity(provider);
  return { error };
}

/**
 * Get user's linked identities (OAuth providers)
 */
export async function getLinkedIdentities(): Promise<string[]> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('Failed to get user:', error);
    return [];
  }
  
  // Extract provider IDs from identities
  const providers: string[] = [];
  for (const identity of user.identities || []) {
    if (identity.provider_id && !providers.includes(identity.provider_id)) {
      providers.push(identity.provider_id);
    }
  }
  
  return providers;
}

/**
 * Check if user has a specific OAuth provider linked
 */
export async function hasLinkedProvider(provider: OAuthProvider): Promise<boolean> {
  const linked = await getLinkedIdentities();
  return linked.includes(provider);
}

/**
 * Get GitHub-specific user info after OAuth login
 */
export async function getGitHubUserInfo(): Promise<{
  login?: string;
  email?: string;
  avatarUrl?: string;
  name?: string;
  error?: Error;
}> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { error };
  }
  
  // Extract GitHub info from user metadata
  const githubLogin = user.user_metadata?.user_name;
  const githubEmail = user.email || user.user_metadata?.email;
  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.name || user.user_metadata?.full_name;
  
  return {
    login: githubLogin,
    email: githubEmail,
    avatarUrl,
    name,
  };
}

/**
 * Configuration for GitHub OAuth scopes
 * These are the standard GitHub OAuth scopes that can be requested
 */
export const GITHUB_SCOPES = {
  // Basic user info
  USER: 'user',
  USER_EMAIL: 'user:email',
  USER_FOLLOW: 'user:follow',
  
  // Repository access
  REPO: 'repo',
  REPO_STATUS: 'repo:status',
  REPO_DEPLOYMENT: 'repo:deployment',
  PUBLIC_REPO: 'public_repo',
  REPO_INVITE: 'repo:invite',
  
  // Read-only access
  READ_ORG: 'read:org',
  READ_USER: 'read:user',
  READ_REPO_HOOK: 'read:repo_hook',
  
  // Write access
  WRITE_ORG: 'write:org',
  WRITE_DISCUSSION: 'write:discussion',
  WRITE_REPO_HOOK: 'write:repo_hook',
  
  // Admin access
  ADMIN_ORG: 'admin:org',
  ADMIN_REPO_HOOK: 'admin:repo_hook',
  DELETE_REPO: 'delete_repo',
  
  // Notifications
  NOTIFICATIONS: 'notifications',
  
  // Projects
  READ_PROJECT: 'read:project',
  WRITE_PROJECT: 'write:project',
  ADMIN_PROJECT: 'admin:project',
  
  // All available scopes for reference
  ALL: [
    'user',
    'user:email',
    'user:follow',
    'public_repo',
    'repo',
    'repo:status',
    'repo:deployment',
    'repo:invite',
    'read:org',
    'read:user',
    'read:repo_hook',
    'write:org',
    'write:discussion',
    'write:repo_hook',
    'admin:org',
    'admin:repo_hook',
    'delete_repo',
    'notifications',
    'read:project',
    'write:project',
    'admin:project',
  ],
} as const;

export type GitHubScope = keyof typeof GITHUB_SCOPES;
