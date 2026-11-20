// Cloudflare Pages Function. The Apps Script URL and secret stay on the server.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const stages = new Set(['within_1m', 'over_1m', 'exploring', ''])

function isAppsScriptUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'script.google.com' && !url.username && !url.password && !url.port && !url.search && !url.hash && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)
  } catch { return false }
}

async function appendSignup(env, signup) {
  // Do not automatically forward a request containing the shared secret to a redirect target.
  let response = await fetch(env.SIGNUP_SCRIPT_URL, {
    method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.SIGNUP_SHARED_SECRET, ...signup }),
    signal: AbortSignal.timeout(15000),
  })
  if ([301, 302, 303].includes(response.status)) {
    const location = response.headers.get('location')
    let redirectUrl
    try { redirectUrl = new URL(location) } catch { throw new Error('invalid_redirect') }
    if (redirectUrl.protocol !== 'https:' || redirectUrl.hostname !== 'script.googleusercontent.com' || redirectUrl.username || redirectUrl.password || redirectUrl.port) throw new Error('invalid_redirect')
    response = await fetch(redirectUrl.toString(), { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) })
  }
  if (!response.ok) throw new Error('script_request_failed')
  const result = await response.json()
  if (result?.ok !== true) throw new Error('save_unconfirmed')
}

export async function onRequestPost({ request, env }) {
  if (!isAppsScriptUrl(env.SIGNUP_SCRIPT_URL) || typeof env.SIGNUP_SHARED_SECRET !== 'string' || env.SIGNUP_SHARED_SECRET.length < 32) return json({ ok: false, error: 'not_configured' }, 503)
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return json({ ok: false, error: 'invalid_origin' }, 403)
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json({ ok: false, error: 'invalid_content_type' }, 415)
  let body
  try { const raw = await request.text(); if (raw.length > 2048) return json({ ok: false, error: 'too_large' }, 413); body = JSON.parse(raw) }
  catch { return json({ ok: false, error: 'invalid_request' }, 400) }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const stage = body?.stage === undefined ? '' : body.stage
  if (email.length > 254 || !emailPattern.test(email) || !stages.has(stage) || body?.consent !== true) return json({ ok: false, error: 'invalid_request' }, 400)
  try {
    await appendSignup(env, { email, stage, consent: true, consent_version: '1' })
    return json({ ok: true }, 201)
  } catch { return json({ ok: false, error: 'save_failed' }, 503) }
}
