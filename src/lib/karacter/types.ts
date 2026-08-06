export type CapabilityAction = {
  name: string;
  description: string;
  params?: Record<string, string>;
};

export type CapabilityConfigField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
};

export type Capability = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  auth_type: "none" | "apikey" | "oauth" | "local_agent" | string;
  runtime: "device" | "cloud" | "agent" | string;
  actions: CapabilityAction[];
  config_schema: CapabilityConfigField[];
};

export type Integration = {
  id: string;
  capability_id: string;
  enabled: boolean;
  status: string;
  config: Record<string, unknown>;
};

export type Intent = {
  capability: string;
  action: string;
  args: Record<string, unknown>;
  reason?: string;
};

export type PlanResult = {
  speech: string;
  intents: Intent[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intents: Intent[];
  createdAt: string;
};
