/** Sends a WhatsApp message via Twilio's REST API (no SDK needed). */
export async function sendTwilioText(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toE164: string,
  body: string,
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const params = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: `whatsapp:${toE164}`,
    Body: body,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: number;
    };
    throw new Error(
      `Twilio error ${res.status}: ${err.message ?? res.statusText}${err.code ? ` (code ${err.code})` : ""}`,
    );
  }
}
