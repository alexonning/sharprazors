import {db} from "@/db/raw";
const COOKIE="sr_admin",SESSION_SECONDS=7*86400,ITERATIONS=100000;
const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer|Uint8Array)=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("");
const toBase64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const fromBase64=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
// Verified when the username does not exist, so unknown users cost the same time as wrong passwords.
const DUMMY_HASH=`pbkdf2$${ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;
async function derive(password:string,salt:Uint8Array<ArrayBuffer>,iterations:number){
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations},key,256));
}
// Format shared with scripts/admin-user.mjs: pbkdf2$<iterations>$<salt base64>$<hash base64>.
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(await derive(password,salt,ITERATIONS))}`}
export async function verifyPassword(password:string,stored:string){
  const [scheme,iterations,salt,hash]=stored.split("$");
  if(scheme!=="pbkdf2"||!salt||!hash)return false;
  const expected=fromBase64(hash),actual=await derive(password,fromBase64(salt),Number(iterations));
  let diff=expected.length^actual.length;
  for(let i=0;i<Math.min(expected.length,actual.length);i++)diff|=expected[i]^actual[i];
  return diff===0;
}
export const tokenHash=async(token:string)=>hex(await crypto.subtle.digest("SHA-256",encoder.encode(token)));
export function readToken(req:Request){return /(?:^|;\s*)sr_admin=([a-f0-9]{64})(?:;|$)/.exec(req.headers.get("cookie")??"")?.[1]??null}
export function sessionCookie(req:Request,token:string,maxAge=SESSION_SECONDS){
  const secure=new URL(req.url).protocol==="https:"||req.headers.get("x-forwarded-proto")==="https";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?"; Secure":""}`;
}
export async function login(username:string,password:string){
  const user=await db().prepare("SELECT username,password_hash AS hash FROM admin_users WHERE username=?").bind(username).first<{username:string,hash:string}>();
  const valid=await verifyPassword(password,user?.hash??DUMMY_HASH);
  if(!user||!valid)return null;
  const token=hex(crypto.getRandomValues(new Uint8Array(32))),now=Date.now();
  await db().batch([
    db().prepare("DELETE FROM admin_sessions WHERE expires_at < ?").bind(new Date(now).toISOString()),
    db().prepare("INSERT INTO admin_sessions (token_hash,username,expires_at) VALUES (?,?,?)").bind(await tokenHash(token),user.username,new Date(now+SESSION_SECONDS*1000).toISOString())
  ]);
  return token;
}
export async function currentAdmin(req:Request){
  const token=readToken(req);
  if(!token)return null;
  const session=await db().prepare("SELECT s.username FROM admin_sessions s JOIN admin_users u ON u.username=s.username WHERE s.token_hash=? AND s.expires_at > ?").bind(await tokenHash(token),new Date().toISOString()).first<{username:string}>();
  return session?.username??null;
}
export async function logout(req:Request){const token=readToken(req);if(token)await db().prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await tokenHash(token)).run()}
