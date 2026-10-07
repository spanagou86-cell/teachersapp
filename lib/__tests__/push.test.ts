import { createECDH, randomBytes } from "node:crypto";
import webpush from "web-push";
import { describe, expect, it } from "vitest";
import { isPushEndpoint } from "../push";

describe("push", () => {
  it("only sends to the browsers' push services", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/QW1")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isPushEndpoint("https://evil.example.com/fcm.googleapis.com")).toBe(false);
    expect(isPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isPushEndpoint("not a url")).toBe(false);
  });

  it("signs and encrypts a reminder for a real-looking subscription", () => {
    const vapid = webpush.generateVAPIDKeys();
    const ecdh = createECDH("prime256v1");
    ecdh.generateKeys();
    const sub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") },
    };
    const req = webpush.generateRequestDetails(sub, JSON.stringify({ title: "Παιδονομία σε 5′", body: "10:00 · Αυλή" }), {
      vapidDetails: { subject: "https://taxi-henna-five.vercel.app", publicKey: vapid.publicKey, privateKey: vapid.privateKey },
      TTL: 300,
    });
    expect(req.method).toBe("POST");
    expect(req.headers.Authorization).toMatch(/^vapid t=/);
    expect(req.headers["Content-Encoding"]).toBe("aes128gcm");
    expect((req.body as Buffer).length).toBeGreaterThan(40);
  });
});
