import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export interface SvixHeaders {
  id?: string | null;
  timestamp?: string | null;
  signature?: string | null;
}

/**
 * Extracts pure email address from strings like 'John Doe <john@seleksia.com>' or 'john@seleksia.com'
 */
export function extractEmailAddress(raw: string | undefined | null): string {
  if (!raw) return "";
  const match = raw.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return raw.trim().toLowerCase();
}

/**
 * Checks if the email address belongs to @seleksia.com (or subdomains).
 */
export function isSeleksiaDomain(email: string, targetDomain = "seleksia.com"): boolean {
  const pureEmail = extractEmailAddress(email);
  if (!pureEmail.includes("@")) return false;

  const domain = pureEmail.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  return domain === targetDomain.toLowerCase() || domain.endsWith(`.${targetDomain.toLowerCase()}`);
}

/**
 * Verifies Svix webhook signature sent by Resend.
 * Resend uses standard Svix signatures (svix-id, svix-timestamp, svix-signature).
 */
export function verifyResendWebhookSignature({
  payload,
  headers,
  secret = process.env.RESEND_WEBHOOK_SECRET,
  toleranceSeconds = 300, // 5 minutes tolerance
}: {
  payload: string;
  headers: SvixHeaders;
  secret?: string;
  toleranceSeconds?: number;
}): { isValid: boolean; error?: string } {
  // If no secret configured in environment (e.g. local dev / testing), allow passing with warning
  if (!secret) {
    return { isValid: true, error: "RESEND_WEBHOOK_SECRET is not configured. Skipping strict signature check." };
  }

  const { id: svixId, timestamp: svixTimestamp, signature: svixSignature } = headers;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return { isValid: false, error: "Missing required Svix headers (svix-id, svix-timestamp, svix-signature)" };
  }

  // Check timestamp freshness to prevent replay attacks
  const timestampNum = parseInt(svixTimestamp, 10);
  if (isNaN(timestampNum)) {
    return { isValid: false, error: "Invalid svix-timestamp header" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampNum) > toleranceSeconds) {
    return { isValid: false, error: "Webhook timestamp is outside the allowed tolerance window" };
  }

  // Clean secret key (Svix secrets usually start with 'whsec_')
  let keyBytes: Buffer;
  try {
    if (secret.startsWith("whsec_")) {
      keyBytes = Buffer.from(secret.substring(6), "base64");
    } else {
      keyBytes = Buffer.from(secret, "utf-8");
    }
  } catch (err) {
    return { isValid: false, error: `Invalid secret format: ${(err as Error).message}` };
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const hmac = crypto.createHmac("sha256", keyBytes);
  hmac.update(signedContent);
  const expectedSignature = hmac.digest("base64");

  // svixSignature can be space-separated signatures e.g. "v1,signature1 v1,signature2"
  const passedSignatures = svixSignature.split(" ");
  let matched = false;

  for (const versionedSig of passedSignatures) {
    const [version, signature] = versionedSig.split(",");
    if (version === "v1" && signature) {
      try {
        const sigBuffer = Buffer.from(signature, "base64");
        const expBuffer = Buffer.from(expectedSignature, "base64");
        if (sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer)) {
          matched = true;
          break;
        }
      } catch {
        // Continue checking other signatures
      }
    }
  }

  if (!matched) {
    return { isValid: false, error: "Invalid Svix signature" };
  }

  return { isValid: true };
}

/**
 * Attempts to associate inbound email with existing Candidate and Company in database.
 */
export async function matchCandidateAndCompany(fromEmail: string, toEmail: string) {
  let candidateId: string | null = null;
  let companyId: string | null = null;

  // 1. Try to find candidate by fromEmail
  if (fromEmail) {
    const candidate = await prisma.candidate.findFirst({
      where: { email: { equals: fromEmail, mode: "insensitive" } },
      select: { id: true, companyId: true },
    });

    if (candidate) {
      candidateId = candidate.id;
      companyId = candidate.companyId;
    }
  }

  // 2. If company is not found yet, check toEmail
  if (!companyId && toEmail) {
    const [localPart] = toEmail.split("@");

    // Check if localPart matches a company slug
    if (localPart) {
      const companyBySlug = await prisma.company.findUnique({
        where: { slug: localPart.toLowerCase() },
        select: { id: true },
      });
      if (companyBySlug) {
        companyId = companyBySlug.id;
      }
    }

    // Check if toEmail matches company smtpUser
    if (!companyId) {
      const companyBySmtp = await prisma.company.findFirst({
        where: { smtpUser: { contains: toEmail, mode: "insensitive" } },
        select: { id: true },
      });
      if (companyBySmtp) {
        companyId = companyBySmtp.id;
      }
    }
  }

  return { candidateId, companyId };
}

/**
 * Fetches full inbound email details from Resend API if payload only contains an ID
 */
export async function fetchResendInboundEmailDetails(emailId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // 1. Try direct fetch to Resend Receiving API
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }

    // 2. Try direct fetch to standard emails API
    const res2 = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (res2.ok) {
      const data = await res2.json();
      return data;
    }

    const errData = await res.json().catch(() => ({}));
    if (errData?.name === "restricted_api_key" || errData?.statusCode === 401) {
      console.error(
        `[Resend Inbound] ⚠️ API Key permission error: "${errData?.message || 'Restricted API Key'}". ` +
        `API Key saat ini hanya memiliki izin "Sending access". Silakan buat API Key baru dengan permission "Full access" di Dashboard Resend agar sistem dapat membaca isi teks email masuk.`
      );
    } else {
      console.warn(`[Resend Inbound] Could not fetch email details (${res.status}):`, errData);
    }
  } catch (err) {
    console.warn(`[Resend Webhook] Could not fetch detailed email from API for ID ${emailId}:`, err);
  }

  return null;
}
