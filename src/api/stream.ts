import { authorizationHeaders, readAuthToken } from './authSession';

export type StreamFrame = {
  type: string;
  payload: Record<string, unknown>;
};

/**
 * GET a stream path and read Server-Sent Events until the Worker emits
 * a terminal result or error frame.
 */
export async function streamGet(
  path: string,
  token?: string,
  onFrame?: (frame: StreamFrame) => void | Promise<void>,
): Promise<Response> {
  const authToken = token ?? readAuthToken();
  const headers: Record<string, string> = {
    ...authorizationHeaders(authToken),
  };

  const streamResponse = await fetch(path, {
    method: 'GET',
    headers,
  });

  if (!streamResponse.ok) {
    return streamResponse;
  }

  return readStreamResponse(streamResponse, onFrame);
}

/**
 * POST to a stream path and read Server-Sent Events until the Worker emits
 * a terminal result or error frame.
 */
export async function streamPost(
  path: string,
  body: unknown,
  token?: string,
  onFrame?: (frame: StreamFrame) => void | Promise<void>,
): Promise<Response> {
  const authToken = token ?? readAuthToken();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...authorizationHeaders(authToken),
  };

  const streamResponse = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!streamResponse.ok) {
    return streamResponse;
  }

  return readStreamResponse(streamResponse, onFrame);
}

export async function readStreamResponse(
  response: Response,
  onFrame?: (frame: StreamFrame) => void | Promise<void>,
): Promise<Response> {
  if (!response.body) {
    return jsonResponse({ error: 'stream_body_unavailable' }, 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const frame = parseSseFrame(rawEvent);
        if (frame) {
          await onFrame?.(frame);
          if (frame.type === 'result') {
            return jsonResponse(frame.payload, 200);
          }
          if (frame.type === 'error') {
            return jsonResponse(frame.payload, statusForStreamError(frame.payload));
          }
          if (frame.type === 'require_action') {
            return jsonResponse(frame.payload, 200);
          }
        }
        separatorIndex = buffer.indexOf('\n\n');
      }
    }

    if (done) {
      break;
    }
  }

  return jsonResponse({ error: 'stream_ended_without_result' }, 502);
}

function parseSseFrame(rawEvent: string): StreamFrame | null {
  let type = 'message';
  const dataLines: string[] = [];
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) {
      type = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const payload = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
  return { type, payload };
}

function statusForStreamError(payload: Record<string, unknown>): number {
  const error = typeof payload.error === 'string' ? payload.error : '';
  if (error === 'invalid_credentials' || error === 'invalid_2fa_code') {
    return 401;
  }
  if (error === 'worker_unavailable') {
    return 503;
  }
  if (error === 'transport_result_timeout') {
    return 504;
  }
  return 500;
}

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
