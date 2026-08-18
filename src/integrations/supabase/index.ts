/**
 * Supabase Integration Index
 * Centralized exports for all Supabase-related functionality
 */

export {
  supabase,
  createSupabaseClient,
} from './client';

export {
  supabaseAdmin,
  createSupabaseAdminClient,
} from './client.server';

export {
  requireSupabaseAuth,
} from './auth-middleware';

export {
  attachSupabaseAuth,
} from './auth-attacher';

export {
  supabaseConfig,
  validateSupabaseConfig,
  getSupabaseConfigError,
  type SupabaseConfig,
} from './config';

export {
  signInWithOAuth,
  signInWithGitHub,
  signInWithGoogle,
  linkOAuthProvider,
  unlinkOAuthProvider,
  getLinkedIdentities,
  hasLinkedProvider,
  getGitHubUserInfo,
  getOAuthRedirectUrl,
  GITHUB_SCOPES,
  type OAuthProvider,
  type OAuthConfig,
  type GitHubScope,
} from './oauth';

export type { Database } from './types';
