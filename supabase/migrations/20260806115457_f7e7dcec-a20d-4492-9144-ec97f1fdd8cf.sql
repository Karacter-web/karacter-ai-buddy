CREATE TABLE public.capabilities (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  icon text NOT NULL DEFAULT 'plug',
  auth_type text NOT NULL DEFAULT 'none',
  runtime text NOT NULL DEFAULT 'cloud',
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  config_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.capabilities TO anon;
GRANT SELECT ON public.capabilities TO authenticated;
GRANT ALL ON public.capabilities TO service_role;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Capability catalog is public" ON public.capabilities FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  capability_id text NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'connected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, capability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own integrations" ON public.integrations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own conversations" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  intents jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.intent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  capability_id text,
  action text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  result text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX intent_logs_user_idx ON public.intent_logs (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_logs TO authenticated;
GRANT ALL ON public.intent_logs TO service_role;
ALTER TABLE public.intent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own intent logs" ON public.intent_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER capabilities_updated_at BEFORE UPDATE ON public.capabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.capabilities (id, name, description, category, icon, auth_type, runtime, actions, config_schema) VALUES
('device', 'Device', 'Built-in device actions that run in the browser: camera, torch hints, clipboard, share, vibration.', 'system', 'smartphone', 'none', 'device', '[{"name":"open_app","description":"Open a device surface such as camera, maps, phone, sms, email","params":{"app":"string","query":"string"}},{"name":"copy_to_clipboard","description":"Copy text to clipboard","params":{"text":"string"}},{"name":"share","description":"Open the native share sheet","params":{"text":"string","url":"string"}},{"name":"vibrate","description":"Vibrate the device","params":{"ms":"number"}}]'::jsonb, '[]'::jsonb),
('browser', 'Browser', 'Open URLs and run web searches in a new tab.', 'system', 'globe', 'none', 'device', '[{"name":"open_url","description":"Open a URL","params":{"url":"string"}},{"name":"web_search","description":"Search the web","params":{"query":"string"}}]'::jsonb, '[]'::jsonb),
('calculator', 'Calculator', 'Evaluate arithmetic expressions locally.', 'utility', 'calculator', 'none', 'device', '[{"name":"evaluate","description":"Evaluate a math expression","params":{"expression":"string"}}]'::jsonb, '[]'::jsonb),
('calendar', 'Calendar', 'Read and create calendar events.', 'productivity', 'calendar', 'oauth', 'cloud', '[{"name":"list_events","description":"List upcoming events","params":{"range":"string"}},{"name":"create_event","description":"Create an event","params":{"title":"string","start":"string","end":"string"}}]'::jsonb, '[{"key":"calendar_id","label":"Calendar ID","type":"text","required":false}]'::jsonb),
('filesystem', 'Filesystem', 'Browse, read and write files through a local agent.', 'system', 'folder', 'local_agent', 'agent', '[{"name":"list_files","description":"List files in a directory","params":{"path":"string"}},{"name":"read_file","description":"Read a file","params":{"path":"string"}},{"name":"write_file","description":"Write a file","params":{"path":"string","content":"string"}}]'::jsonb, '[{"key":"agent_url","label":"Local agent URL","type":"text","required":true},{"key":"root","label":"Allowed root path","type":"text","required":false}]'::jsonb),
('terminal', 'Terminal', 'Run shell commands via an authorized local agent.', 'system', 'terminal', 'local_agent', 'agent', '[{"name":"run_command","description":"Run a shell command","params":{"command":"string"}}]'::jsonb, '[{"key":"agent_url","label":"Local agent URL","type":"text","required":true},{"key":"allowlist","label":"Command allowlist (comma separated)","type":"text","required":false}]'::jsonb),
('github', 'GitHub', 'Repositories, issues and pull requests.', 'developer', 'github', 'oauth', 'cloud', '[{"name":"list_repos","description":"List repositories","params":{}},{"name":"create_issue","description":"Create an issue","params":{"repo":"string","title":"string","body":"string"}}]'::jsonb, '[{"key":"default_repo","label":"Default repository","type":"text","required":false}]'::jsonb),
('docker', 'Docker', 'Inspect and control containers through a local agent.', 'developer', 'container', 'local_agent', 'agent', '[{"name":"list_containers","description":"List containers","params":{}},{"name":"container_action","description":"Start/stop/restart a container","params":{"container":"string","action":"string"}}]'::jsonb, '[{"key":"agent_url","label":"Local agent URL","type":"text","required":true}]'::jsonb),
('obs', 'OBS Studio', 'Control scenes, streaming and recording via obs-websocket.', 'media', 'video', 'apikey', 'agent', '[{"name":"switch_scene","description":"Switch to a scene","params":{"scene":"string"}},{"name":"toggle_recording","description":"Start or stop recording","params":{"state":"string"}}]'::jsonb, '[{"key":"ws_url","label":"obs-websocket URL","type":"text","required":true}]'::jsonb),
('spotify', 'Spotify', 'Playback control and search.', 'media', 'music', 'oauth', 'cloud', '[{"name":"play","description":"Play a track, album or playlist","params":{"query":"string"}},{"name":"pause","description":"Pause playback","params":{}},{"name":"next_track","description":"Skip to the next track","params":{}}]'::jsonb, '[]'::jsonb),
('whatsapp', 'WhatsApp', 'Send messages through the WhatsApp Business API or deep links.', 'communication', 'message-circle', 'apikey', 'cloud', '[{"name":"send_message","description":"Send a message","params":{"to":"string","text":"string"}}]'::jsonb, '[{"key":"phone_number_id","label":"Phone number ID","type":"text","required":false}]'::jsonb),
('email', 'Email', 'Compose and send email.', 'communication', 'mail', 'apikey', 'cloud', '[{"name":"send_email","description":"Send an email","params":{"to":"string","subject":"string","body":"string"}}]'::jsonb, '[{"key":"from_address","label":"From address","type":"text","required":false}]'::jsonb),
('neon', 'Neon', 'Serverless Postgres projects and SQL.', 'data', 'database', 'apikey', 'cloud', '[{"name":"list_projects","description":"List Neon projects","params":{}},{"name":"run_sql","description":"Run a SQL query","params":{"sql":"string"}}]'::jsonb, '[{"key":"project_id","label":"Project ID","type":"text","required":false}]'::jsonb),
('supabase', 'Supabase', 'Query tables and inspect your Supabase project.', 'data', 'database', 'apikey', 'cloud', '[{"name":"query_table","description":"Query a table","params":{"table":"string","filter":"string"}}]'::jsonb, '[{"key":"project_ref","label":"Project ref","type":"text","required":false}]'::jsonb),
('vscode', 'VS Code', 'Open files and workspaces in VS Code via a local agent.', 'developer', 'code', 'local_agent', 'agent', '[{"name":"open_path","description":"Open a file or folder in VS Code","params":{"path":"string"}}]'::jsonb, '[{"key":"agent_url","label":"Local agent URL","type":"text","required":true}]'::jsonb);