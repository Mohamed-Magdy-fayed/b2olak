import "server-only";

/** Wapilot WhatsApp API wrapper — ported from the reference app. */

const baseUrl = "https://api.wapilot.net/api/v2/";

export type SendMessageParams = {
  chat_id: string;
  text: string;
};

export type InstanceStatusResponse = {
  status: string;
};

async function wapilotRequest<T>({
  endpoint,
  body,
  method,
  token,
  logLabel,
}: {
  endpoint: string;
  body?: unknown;
  method: "GET" | "POST";
  token: string;
  /** Optional label included in the log line (e.g. the recipient chat_id) so
   *  Vercel/stdout doesn't collapse identical lines from different recipients
   *  into a single entry with a badge count. */
  logLabel?: string;
}): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Include the recipient so duplicate sends to the *same* chat are
  // immediately visible, and so Vercel doesn't collapse sends to
  // *different* recipients (identical log strings) into a badge count.
  console.info(
    `[wapilot] ${method} ${endpoint}${logLabel ? ` to=${logLabel}` : ""} -> HTTP ${response.status}`,
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      errorData.message ?? `Wapilot request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export function checkStatus({
  instanceId,
  token,
}: {
  instanceId: string;
  token: string;
}): Promise<InstanceStatusResponse> {
  return wapilotRequest<InstanceStatusResponse>({
    endpoint: `instances/${instanceId}/status`,
    method: "GET",
    token,
  });
}

export function sendText({
  instanceId,
  params,
  token,
}: {
  instanceId: string;
  params: SendMessageParams;
  token: string;
}): Promise<unknown> {
  return wapilotRequest({
    endpoint: `${instanceId}/send-message`,
    method: "POST",
    body: params,
    token,
    logLabel: params.chat_id,
  });
}
