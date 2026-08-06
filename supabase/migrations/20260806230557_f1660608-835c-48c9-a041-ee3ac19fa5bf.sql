CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  display_name text NOT NULL DEFAULT '',
  nickname text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  age integer,
  avatar_url text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT '',
  wake_word text NOT NULL DEFAULT 'hey karacter',
  wake_word_enabled boolean NOT NULL DEFAULT false,
  require_voice_match boolean NOT NULL DEFAULT false,
  require_face_match boolean NOT NULL DEFAULT false,
  lock_on_mismatch boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own preferences" ON public.user_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.biometric_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL,
  label text NOT NULL DEFAULT '',
  signature jsonb NOT NULL DEFAULT '[]'::jsonb,
  samples integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_enrollments TO authenticated;
GRANT ALL ON public.biometric_enrollments TO service_role;
ALTER TABLE public.biometric_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own biometrics" ON public.biometric_enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER biometric_enrollments_updated_at BEFORE UPDATE ON public.biometric_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  consent_key text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, consent_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own consents" ON public.consent_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER consent_records_updated_at BEFORE UPDATE ON public.consent_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.permission_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  permission text NOT NULL,
  state text NOT NULL DEFAULT 'prompt',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_grants TO authenticated;
GRANT ALL ON public.permission_grants TO service_role;
ALTER TABLE public.permission_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own permission grants" ON public.permission_grants FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER permission_grants_updated_at BEFORE UPDATE ON public.permission_grants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.assistant_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  confidence numeric NOT NULL DEFAULT 0.6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_memories TO authenticated;
GRANT ALL ON public.assistant_memories TO service_role;
ALTER TABLE public.assistant_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own assistant memories" ON public.assistant_memories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER assistant_memories_updated_at BEFORE UPDATE ON public.assistant_memories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();