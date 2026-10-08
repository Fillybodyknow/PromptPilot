import * as client from "openid-client";
import { BASE_PATH } from "../basePath";
import { msCallbackUrl, msSettings } from "./config";

/** cookie ชั่วคราวระหว่างไปหน้า login ของ Microsoft แล้วกลับมา (เก็บค่ากัน CSRF / replay) */
export const OIDC_COOKIE = "pp_oidc";
// ต้องรวม basePath ไม่อย่างนั้น browser ไม่ส่ง cookie กลับมาที่ callback เมื่อเว็บอยู่ใต้ path ย่อย
export const OIDC_COOKIE_PATH = `${BASE_PATH}/auth/microsoft`;

// โหลด metadata ของ Entra ID ครั้งเดียวต่อ process (ถ้าโหลดไม่สำเร็จ ครั้งหน้าลองใหม่)
let configPromise: Promise<client.Configuration> | null = null;
function getConfig(): Promise<client.Configuration> {
  if (!configPromise) {
    const s = msSettings();
    // ใช้ endpoint ของ tenant บริษัทโดยตรง (ไม่ใช่ /common) — บัญชีส่วนตัวหรือของบริษัทอื่นจึง login ไม่ได้ตั้งแต่ฝั่ง Microsoft
    const issuer = new URL(`${s.authority}/${s.tenantId}/v2.0`);
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
  oid: string;
  /** บัญชี guest (B2B) จากองค์กรอื่นที่ถูกเชิญเข้า tenant — ไม่นับเป็นผู้ดูแลระบบจาก ADMIN_EMAILS */
  guest: boolean;
  /** อีเมลที่ใช้แสดงผล (claim email ถ้ามี ไม่อย่างนั้นใช้ UPN) */
  email: string;
  /** User Principal Name — ชื่อ login ที่ IT กำหนดใน tenant (ส่วนใหญ่หน้าตาเหมือนอีเมล) */
  upn: string;
  name: string | null;
}

/**
 * รับ code ที่ Microsoft ส่งกลับมา แลกเป็น ID token แล้วตรวจลายเซ็น issuer audience nonce state ผ่าน openid-client
 * callbackSearch = query string ของคำขอที่เข้ามา (สร้าง URL ใหม่จาก APP_URL เพราะหลัง proxy ตัวแอปเห็นที่อยู่ภายใน)
 */
export async function completeLogin(callbackSearch: string, st: OidcState): Promise<MicrosoftIdentity> {
  const config = await getConfig();
  const currentUrl = new URL(msCallbackUrl() + callbackSearch);
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: st.verifier,
    expectedState: st.state,
    expectedNonce: st.nonce,
    idTokenExpected: true,
  });
  const claims = tokens.claims();
  if (!claims) throw new Error("ไม่ได้รับ ID token จาก Microsoft");
  // openid-client ตรวจ issuer (= tenant ของบริษัท), audience, เวลาหมดอายุ, nonce, state และ PKCE ให้แล้ว
  // เช็ก tid ซ้ำอีกชั้น โดยเทียบกับ tenant ใน issuer จริง (MS_TENANT_ID อาจตั้งเป็นชื่อโดเมนแทน GUID ก็ได้)
  const issuerTenant = config.serverMetadata().issuer.split("/").at(-2)?.toLowerCase();
  if (typeof claims.tid !== "string" || claims.tid.toLowerCase() !== issuerTenant) throw new Error("บัญชีนี้ไม่ได้อยู่ในองค์กร");
  const oid = typeof claims.oid === "string" ? claims.oid : "";
  const upn = String(claims.preferred_username ?? "").trim().toLowerCase();
  const email = String(claims.email ?? upn).trim().toLowerCase();
  if (!oid || !email) throw new Error("Microsoft ไม่ได้ส่งรหัสผู้ใช้หรืออีเมลมา");
  // claim idp มีเฉพาะเมื่อผู้ใช้ยืนยันตัวตนกับ identity provider อื่น เช่น guest จาก tenant อื่น
  const guest = typeof claims.idp === "string" && claims.idp !== "";
  return { oid, guest, email: email.slice(0, 320), upn: upn.slice(0, 320), name: typeof claims.name === "string" ? claims.name.slice(0, 200) : null };
}
