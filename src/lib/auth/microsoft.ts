import * as client from "openid-client";
import type { ACCOUNT_TYPES } from "@/db/schema";
import { BASE_PATH } from "../basePath";
import { msCallbackUrl, msSettings } from "./config";

/** cookie ชั่วคราวระหว่างไปหน้า login ของ Microsoft แล้วกลับมา (เก็บค่ากัน CSRF / replay) */
export const OIDC_COOKIE = "pp_oidc";
// ต้องรวม basePath ไม่อย่างนั้น browser ไม่ส่ง cookie กลับมาที่ callback เมื่อเว็บอยู่ใต้ path ย่อย
export const OIDC_COOKIE_PATH = `${BASE_PATH}/auth/microsoft`;

/** tenant ID ที่ Microsoft ใช้กับบัญชี Microsoft ส่วนตัวทุกบัญชี (outlook.com, hotmail.com, live.com) */
const PERSONAL_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

// โหลด metadata ของ Entra ID ครั้งเดียวต่อ process (ถ้าโหลดไม่สำเร็จ ครั้งหน้าลองใหม่)
let configPromise: Promise<client.Configuration> | null = null;
function getConfig(): Promise<client.Configuration> {
  if (!configPromise) {
    const s = msSettings();
    if (s.tenantId.toLowerCase() === PERSONAL_TENANT) throw new Error("MS_TENANT_ID ต้องเป็น tenant ของบริษัท ไม่ใช่ tenant ของบัญชี Microsoft ส่วนตัว");
    if (s.allowExternal && !GUID_RE.test(s.tenantId)) {
      throw new Error("MS_ALLOW_EXTERNAL=true ต้องตั้ง MS_TENANT_ID เป็น GUID ของ tenant บริษัท (ใช้แยกพนักงานออกจากบัญชีภายนอก)");
    }
    // ปกติใช้ endpoint ของ tenant บริษัทโดยตรง — บัญชีภายนอกถูก Microsoft ปฏิเสธตั้งแต่หน้า login
    // ถ้าเปิดรับบัญชีภายนอก ใช้ /common ซึ่งรับทั้งบัญชีองค์กรใดก็ได้และบัญชีส่วนตัว
    // (openid-client ตรวจ issuer ของ token ให้ตรงกับ tenant ของบัญชีนั้นเองโดยอัตโนมัติ — issuer ของ /common เป็นแม่แบบ {tenantid})
    const issuer = new URL(`${s.authority}/${s.allowExternal ? "common" : s.tenantId}/v2.0`);
    // http ยอมเฉพาะ authority บนเครื่องตัวเอง (ทดสอบด้วย mock) — ของจริงต้องเป็น https เสมอ
    const insecure = issuer.protocol === "http:";
    if (insecure && !["localhost", "127.0.0.1"].includes(issuer.hostname)) throw new Error("MS_AUTHORITY ต้องเป็น https://");
    configPromise = client
      .discovery(issuer, s.clientId, undefined, client.ClientSecretPost(s.clientSecret), insecure ? { execute: [client.allowInsecureRequests] } : undefined)
      .catch((err) => {
        configPromise = null;
        throw err;
      });
  }
  return configPromise;
}

export interface OidcState {
  verifier: string;
  state: string;
  nonce: string;
  next: string;
}

/** URL หน้า login ของ Microsoft + ค่าที่ต้องเก็บไว้ใน cookie เพื่อตรวจตอนกลับมา (PKCE + state + nonce) */
export async function buildLoginRedirect(next: string): Promise<{ url: URL; state: OidcState }> {
  const config = await getConfig();
  const st: OidcState = { verifier: client.randomPKCECodeVerifier(), state: client.randomState(), nonce: client.randomNonce(), next };
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: msCallbackUrl(),
    scope: "openid profile email",
    code_challenge: await client.calculatePKCECodeChallenge(st.verifier),
    code_challenge_method: "S256",
    state: st.state,
    nonce: st.nonce,
    // ให้ผู้ใช้เลือกบัญชีทุกครั้ง กันเครื่องที่ใช้ร่วมกันเข้าด้วยบัญชีของคนก่อนหน้าโดยไม่รู้ตัว
    prompt: "select_account",
  });
  return { url, state: st };
}

export interface MicrosoftIdentity {
  /** tenant ของบัญชี — คู่กับ oid เป็นตัวระบุผู้ใช้ */
  tid: string;
  oid: string;
  /** พนักงาน / guest ใน tenant บริษัท / บัญชีองค์กรอื่น / บัญชีส่วนตัว — คนที่ไม่ใช่พนักงานต้องรออนุมัติ */
  accountType: AccountType;
  /** อีเมลที่ใช้แสดงผล (claim email ถ้ามี ไม่อย่างนั้นใช้ UPN) — บัญชีภายนอกตั้งเองได้ ห้ามใช้ตัดสินสิทธิ์ */
  email: string;
  /** ชื่อ login (preferred_username) — ของพนักงานคือ UPN ที่ IT กำหนดใน tenant บริษัท */
  upn: string;
  name: string | null;
}

/** ตัดอักขระที่มองไม่เห็นหรือกลับทิศข้อความ (bidi, zero-width) — ใช้ปลอมชื่อ/อีเมลให้ดูเหมือนของคนอื่นได้ */
const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const clean = (s: string) => s.replace(INVISIBLE_RE, "").trim();

/** แยกประเภทบัญชีจาก tenant ของ token และ claim idp */
export function classifyAccount(tid: string, idp: unknown, homeTenant: string): AccountType {
  if (tid === PERSONAL_TENANT) return "personal";
  if (tid !== homeTenant.toLowerCase()) return "external";
  // claim idp มีเฉพาะเมื่อผู้ใช้ยืนยันตัวตนกับ identity provider อื่น เช่น guest ที่ถูกเชิญจากองค์กรอื่น
  return typeof idp === "string" && idp !== "" ? "guest" : "member";
}

/**
 * รับ code ที่ Microsoft ส่งกลับมา แลกเป็น ID token แล้วตรวจ issuer audience เวลา nonce state และ PKCE ผ่าน openid-client
 * callbackSearch = query string ของคำขอที่เข้ามา (สร้าง URL ใหม่จาก APP_URL เพราะหลัง proxy ตัวแอปเห็นที่อยู่ภายใน)
 */
export async function completeLogin(callbackSearch: string, st: OidcState): Promise<MicrosoftIdentity> {
  const config = await getConfig();
  const s = msSettings();
  const currentUrl = new URL(msCallbackUrl() + callbackSearch);
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: st.verifier,
    expectedState: st.state,
    expectedNonce: st.nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims) throw new Error("ไม่ได้รับ ID token จาก Microsoft");
  const tid = typeof claims.tid === "string" ? claims.tid.toLowerCase() : "";
  if (!GUID_RE.test(tid)) throw new Error("token ไม่มี tenant ID");

  // tenant บริษัท: เทียบกับ tenant ใน issuer จริง (โหมด tenant เดียว MS_TENANT_ID อาจเป็นชื่อโดเมนก็ได้)
  const homeTenant = s.allowExternal ? s.tenantId.toLowerCase() : (config.serverMetadata().issuer.split("/").at(-2)?.toLowerCase() ?? "");
  // โหมด tenant เดียว: ยืนยันซ้ำอีกชั้นว่าเป็นบัญชีใน tenant บริษัท
  if (!s.allowExternal && tid !== homeTenant) throw new Error("บัญชีนี้ไม่ได้อยู่ในองค์กร");

  const oid = typeof claims.oid === "string" ? claims.oid : typeof claims.sub === "string" ? claims.sub : "";
  const upn = clean(String(claims.preferred_username ?? "")).toLowerCase();
  const email = clean(String(claims.email ?? upn)).toLowerCase();
  if (!oid || !email) throw new Error("Microsoft ไม่ได้ส่งรหัสผู้ใช้หรืออีเมลมา");
  return {
    tid,
    oid,
    accountType: classifyAccount(tid, claims.idp, homeTenant),
    email: email.slice(0, 320),
    upn: upn.slice(0, 320),
    name: typeof claims.name === "string" ? clean(claims.name).slice(0, 200) || null : null,
  };
}
