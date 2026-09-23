import type { StreamFrame } from './stream';
import { streamGet, streamPost } from './stream';

export type AgentProfile = {
  role: string;
  display_name: string;
  description: string;
};

export type SessionSummary = {
  session_id: string;
  title: string;
  project_id: string | null;
  agent_role: string;
  user_id: string;
  created_at: number;
  updated_at: number;
  message_count: number;
};

export type SessionMessage = {
  role: string;
  content: string;
  tool_name?: string;
  tool_call_id?: string;
};

export async function fetchAgents(token?: string): Promise<AgentProfile[]> {
  const response = await streamGet('/api/v1/stream/agents/list', token);
  if (!response.ok) {
    return [];
  }
  try {
    const data = await response.json();
    return (data.agents as AgentProfile[]) ?? [];
  } catch {
    return [];
  }
}

export async function fetchSessions(token?: string): Promise<SessionSummary[]> {
  const response = await streamGet('/api/v1/stream/sessions/list', token);
  if (!response.ok) {
    return [];
  }
  try {
    const data = await response.json();
    return (data.sessions as SessionSummary[]) ?? [];
  } catch {
    return [];
  }
}

export async function fetchHistory(
  sessionId: string,
  token?: string,
): Promise<SessionMessage[]> {
  const response = await streamGet(
    `/api/v1/stream/sessions/${encodeURIComponent(sessionId)}/history`,
    token,
  );
  if (!response.ok) {
    return [];
  }
  try {
    const data = await response.json();
    return (data.messages as SessionMessage[]) ?? [];
  } catch {
    return [];
  }
}

export type SendMessageResult =
  | { type: 'reply'; content: string }
  | { type: 'require_action'; action: string; request_id: string; tool_name: string; capability: string }
  | { type: 'error'; message: string };

export async function sendMessage(
  sessionId: string,
  message: string,
  token?: string,
  onChunk?: (token: string) => void,
): Promise<SendMessageResult> {
  const response = await streamPost(
    `/api/v1/stream/sessions/${encodeURIComponent(sessionId)}/chat`,
    { prompt: message },
    token,
    (frame) => {
      if (frame.type === 'chunk' && typeof (frame.payload as Record<string, unknown>).token === 'string') {
        onChunk?.((frame.payload as Record<string, unknown>).token as string);
      }
    },
  );
  if (!response.ok) {
    return { type: 'error', message: `HTTP ${response.status}` };
  }
  try {
    const data = await response.json() as Record<string, unknown>;
    if (typeof data.assistant === 'string') {
      return { type: 'reply', content: data.assistant };
    }
    if (data.action === 'approve_tool' && typeof data.request_id === 'string') {
      return {
        type: 'require_action',
        action: data.action as string,
        request_id: data.request_id as string,
        tool_name: (data.tool_name as string) ?? '',
        capability: (data.capability as string) ?? '',
      };
    }
    return { type: 'error', message: 'unexpected response' };
  } catch {
    return { type: 'error', message: 'invalid json' };
  }
}
