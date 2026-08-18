# Supabase Integration Guide

This document explains how Supabase is integrated into Karacter AI Buddy and how to set up your development environment.

---

## 📋 Architecture Overview

Karacter AI Buddy uses **Supabase** for:
- User authentication (email/password, OAuth providers)
- Database storage (conversations, profiles, capabilities, etc.)
- Real-time subscriptions
- Row-level security (RLS)

### Dual-Client Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  @/integrations/supabase/client.ts                        │  │
│  │  - Uses: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY │  │
│  │  - Auth: JWT with localStorage persistence                 │  │
│  │  - Access: Subject to RLS policies                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE CLOUD                            │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  Auth Service   │  │        Postgres Database          │  │
│  │                 │  │  ┌─────────┐  ┌─────────┐         │  │
│  │  - Google OAuth │  │  │ public  │  │ private │         │  │
│  │  - GitHub OAuth │  │  │ tables  │  │ tables  │         │  │
│  │  - Email/Pass   │  │  └─────────┘  └─────────┘         │  │
│  │  - Sessions    │  │  (RLS enforced)                  │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVER (Cloudflare Workers)                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  @/integrations/supabase/client.server.ts                  │  │
│  │  - Uses: SUPABASE_SERVICE_ROLE_KEY                        │  │
│  │  - Auth: Service role (bypasses RLS)                      │  │
│  │  - Access: Full database access                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  @/integrations/supabase/auth-middleware.ts                │  │
│  │  - Validates JWT from client requests                     │  │
│  │  - Attaches user context to server functions              │  │
│  │  - Enforces authentication for protected routes           │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link your project**
   ```bash
   # From project root
   supabase link --project-ref kcaemoljtmtcwvibxomc
   ```
   
   This creates a `supabase` directory with project configuration.

4. **Start local development**
   ```bash
   # Start Supabase locally (optional)
   supabase start
   
   # In another terminal, run the dev server
   npm run dev
   ```

### Option 2: Environment Variables

1. **Copy the example file**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Get your Supabase credentials**
   - Go to [Supabase Dashboard](https://app.supabase.com/project/kcaemoljtmtcwvibxomc)
   - Navigate to: Settings > API
   - Copy `Project URL` and `anon` / `publishable` key

3. **Update `.env.local`**
   ```env
   VITE_SUPABASE_URL=https://kcaemoljtmtcwvibxomc.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
   VITE_SUPABASE_PROJECT_ID=kcaemoljtmtcwvibxomc
   ```

4. **For server-side development**
   - Get the `service_role` key from Settings > API
   - Add to `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
   ```

---

## 🔐 OAuth Providers Setup

Supabase Auth supports multiple OAuth providers. This project currently uses **Google** and **GitHub**.

### Enabling OAuth in Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com/project/kcaemoljtmtcwvibxomc)
2. Navigate to: Authentication > Providers
3. Enable the providers you need:
   - **Google**: Toggle on, configure client ID/secret from Google Cloud Console
   - **GitHub**: Toggle on, configure client ID/secret from GitHub OAuth Apps
   - **Others**: Apple, Azure, Discord, etc. (see [Supabase Auth Docs](https://supabase.com/docs/guides/auth/social-login))

### GitHub OAuth Setup

1. **Create GitHub OAuth App**
   - Go to: https://github.com/settings/developers
   - Click "New OAuth App"
   - Application name: `Karacter AI Buddy`
   - Homepage URL: `http://localhost:3000` (or your production URL)
   - Authorization callback URL: `http://localhost:3000/auth/callback`

2. **Configure in Supabase**
   - In Supabase Dashboard > Authentication > Providers > GitHub
   - Enable GitHub
   - Enter Client ID and Client Secret from GitHub
   - (Optional) Configure custom scopes if needed

3. **Use in Application**
   ```typescript
   import { signInWithGitHub } from '@/integrations/supabase/oauth';
   
   async function handleGitHubLogin() {
     const { error } = await signInWithGitHub();
     if (error) {
       console.error('GitHub login failed:', error);
     }
   }
   ```

---

## 🛡️ Security Considerations

### Environment Variables

| Variable | Side | Sensitivity | Purpose |
|----------|------|-------------|---------|
| `VITE_SUPABASE_URL` | Client | Low | Project endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client | Low | Public auth key |
| `SUPABASE_URL` | Server | Medium | Project endpoint |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Medium | Public auth key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | **HIGH** | Admin access (bypasses RLS) |

⚠️ **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.

### Production Deployment (Cloudflare Workers)

1. **Set secrets in Cloudflare Dashboard**
   - Go to: Workers & Pages > Your Project > Settings > Variables
   - Add these as **encrypted secrets**:
     - `SUPABASE_URL`
     - `SUPABASE_PUBLISHABLE_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY`
     - `MISTRAL_API_KEY`

2. **Deploy**
   ```bash
   npm run deploy
   ```

---

## 📊 Database Schema

The database schema is defined in TypeScript types at:
- `src/integrations/supabase/types.ts`

### Key Tables

| Table | Purpose | RLS Enforced |
|-------|---------|--------------|
| `profiles` | User profiles | ✅ Yes |
| `conversations` | Chat conversations | ✅ Yes |
| `messages` | Chat messages | ✅ Yes |
| `capabilities` | AI capabilities | ✅ Yes |
| `assistant_memories` | AI memory | ✅ Yes |
| `integrations` | User integrations | ✅ Yes |
| `intent_logs` | Intent tracking | ✅ Yes |
| `biometric_enrollments` | Biometric auth | ✅ Yes |
| `consent_records` | GDPR consent | ✅ Yes |

### Row-Level Security (RLS)

All tables have RLS policies. Server-side operations use the service role key to bypass RLS when necessary.

---

## 🔄 Authentication Flow

### Client-Side Flow

```typescript
import { supabase } from '@/integrations/supabase/client';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
});

// Sign in with OAuth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: window.location.origin,
  },
});

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Listen to auth state changes
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    console.log('Auth event:', event);
  }
);
```

### Server-Side Flow

```typescript
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// In server functions (with RLS)
export const getProfile = createServerFn()
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // context.supabase is authenticated with user's JWT
    const { data } = await context.supabase
      .from('profiles')
      .select('*')
      .eq('user_id', context.userId)
      .single();
    return data;
  });

// Admin operations (bypasses RLS)
async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  return { error };
}
```

---

## 🔧 Common Operations

### Querying Data (Client-Side)

```typescript
import { supabase } from '@/integrations/supabase/client';

// Get user profile
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();

// Insert with RLS
const { data: conversation, error } = await supabase
  .from('conversations')
  .insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    title: 'New chat',
  })
  .select();

// Real-time subscription
const { data: subscription } = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe();
```

### Querying Data (Server-Side)

```typescript
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getConversations = createServerFn()
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from('conversations')
      .select('*')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false });
    return data;
  });
```

---

## 📚 Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [JavaScript Client Library](https://supabase.com/docs/reference/javascript)

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables"

**Solution**: Ensure all required environment variables are set:
- For client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- For server: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### "JWT validation failed"

**Solution**: 
1. Check that the JWT hasn't expired
2. Verify the `SUPABASE_URL` matches your project URL
3. Ensure you're using the correct publishable key

### OAuth redirect issues

**Solution**:
1. Verify the callback URL in Supabase Dashboard > Authentication > Providers
2. Ensure the redirect URL in your app matches exactly
3. For local dev, use `http://localhost:3000/auth/callback`

### "RLS policy violation"

**Solution**:
1. Check your RLS policies in Supabase Dashboard > Authentication > Policies
2. Ensure the user has the correct role/permissions
3. For admin operations, use the service role key (server-side only)

---

## 💡 Best Practices

1. **Always use the client-side Supabase instance for browser code**
   ```typescript
   import { supabase } from '@/integrations/supabase/client';
   ```

2. **Always use the server-side Supabase instance for server functions**
   ```typescript
   import { supabaseAdmin } from '@/integrations/supabase/client.server';
   // OR use the context from middleware
   import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
   ```

3. **Never expose the service role key to client code**

4. **Use middleware for protected routes**
   ```typescript
   export const protectedFunction = createServerFn()
     .middleware([requireSupabaseAuth])
     .handler(async ({ context }) => {
       // context.supabase is authenticated with user's JWT
     });
   ```

5. **Use type-safe queries with the Database types**
   ```typescript
   import type { Database } from '@/integrations/supabase/types';
   ```

---

## 🎯 Next Steps

1. ✅ Set up environment variables
2. ✅ Enable OAuth providers in Supabase Dashboard
3. ✅ Test authentication flows
4. ✅ Verify database access
5. Deploy to Cloudflare Workers
