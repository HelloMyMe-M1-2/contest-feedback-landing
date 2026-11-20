// Cloudflare Pages Function. All credentials are server-side secrets.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const stages = new Set(['within_1m', 'over_1m', 'exploring', ''])
const encoder = new TextEncoder()
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const encodeJson = value => base64url(encoder.encode(JSON.stringify(value)))

async function accessToken(env) {
  const pem = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')
  const binary = atob(base64)
  const keyData = Uint8Array.from(binary, c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8', keyData, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  const header = encodeJson({ alg:'RS256', typ:'JWT' })
  const claims = encodeJson({ iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope:'https://www.googleapis.com/auth/spreadsheets', aud:'https://oauth2.googleapis.com/token', iat:now, exp:now+3600 })
  const content = `${header}.${claims}`
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(content)))
  const body = new URLSearchParams({ grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion:`${content}.${base64url(signature)}` })
  const result = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body })
  if (!result.ok) throw new Error('token_request_failed')
  const data = await result.json()
  if (typeof data.access_token !== 'string' || !data.access_token) throw new Error('invalid_token_response')
  return data.access_token
}
async function appendSignup(env, values) {
  const token = await accessToken(env)
  const sheetId = encodeURIComponent(env.GOOGLE_SHEETS_SPREADSHEET_ID)
  const range = encodeURIComponent("'signups'!A:D")
  const result = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method:'POST', headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify({ majorDimension:'ROWS', values:[values] })
  })
  if (!result.ok) throw new Error('sheet_request_failed')
  const data = await result.json()
  if (data.updates?.updatedRows !== 1) throw new Error('sheet_response_unconfirmed')
}
export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_SHEETS_SPREADSHEET_ID || !env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) return json({ok:false,error:'not_configured'},503)
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return json({ok:false,error:'invalid_origin'},403)
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json({ok:false,error:'invalid_content_type'},415)
  let body
  try { const raw = await request.text(); if (raw.length > 2048) return json({ok:false,error:'too_large'},413); body = JSON.parse(raw) }
  catch { return json({ok:false,error:'invalid_request'},400) }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const stage = body?.stage || ''
  if (email.length > 254 || !emailPattern.test(email) || !stages.has(stage) || body?.consent !== true) return json({ok:false,error:'invalid_request'},400)
  try { await appendSignup(env,[new Date().toISOString(),email,stage,'1']); return json({ok:true},201) }
  catch { return json({ok:false,error:'save_failed'},503) }
}
