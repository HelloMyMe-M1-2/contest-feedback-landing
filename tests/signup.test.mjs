import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { onRequestPost } from '../functions/api/signup.js'

const env = { SIGNUP_SCRIPT_URL: 'https://script.google.com/macros/s/fake-deployment/exec', SIGNUP_SHARED_SECRET: 'a'.repeat(48) }
const request = (body, origin = 'https://example.com') => new Request('https://example.com/api/signup', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
const valid = { email: ' User@Example.com ', stage: 'exploring', consent: true }

test('정상 저장 응답을 확인하고 이메일과 비밀값은 POST 본문으로만 보낸다', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original }); const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), options }); return Response.json({ ok: true }) }
  const response = await onRequestPost({ request: request(valid), env })
  assert.equal(response.status, 201); assert.equal((await response.json()).ok, true)
  const sent = JSON.parse(calls[0].options.body)
  assert.deepEqual(sent, { secret: env.SIGNUP_SHARED_SECRET, email: 'user@example.com', stage: 'exploring', consent: true, consent_version: '1' })
  assert.equal(calls[0].options.redirect, 'manual'); assert.ok(!calls[0].url.includes('user@example.com'))
})

test('Google 콘텐츠 응답 리디렉션은 본문 없이 신뢰된 주소에만 GET으로 요청한다', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original }); const calls = []
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), options }); return calls.length === 1 ? new Response(null, { status: 302, headers: { location: 'https://script.googleusercontent.com/macros/echo?token=one-time' } }) : Response.json({ ok: true }) }
  assert.equal((await onRequestPost({ request: request(valid), env })).status, 201)
  assert.equal(calls.length, 2); assert.equal(calls[1].options.method, 'GET'); assert.equal(calls[1].options.body, undefined)
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/redirect' } })
  assert.equal((await onRequestPost({ request: request(valid), env })).status, 503)
})

test('잘못된 값과 외부 출처는 스크립트로 보내지 않는다', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original }); let calls = 0; globalThis.fetch = async () => { calls++; throw Error('unexpected') }
  for (const body of [{ email: 'bad', consent: true }, { email: 'a@example.com', consent: false }, { email: 'a@example.com', stage: 'invalid', consent: true }, { email: 'a@example.com', stage: null, consent: true }]) assert.equal((await onRequestPost({ request: request(body), env })).status, 400)
  assert.equal((await onRequestPost({ request: request(valid, 'https://other.example'), env })).status, 403)
  assert.equal((await onRequestPost({ request: request(valid), env: { ...env, SIGNUP_SCRIPT_URL: 'https://evil.example/' } })).status, 503)
  assert.equal((await onRequestPost({ request: request(valid), env: {} })).status, 503)
  assert.equal(calls, 0)
})

test('오류, 거부 또는 확인되지 않은 응답이면 완료를 반환하지 않는다', async (t) => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original })
  for (const result of [() => new Response('', { status: 500 }), () => Response.json({ ok: false }), () => new Response('not json'), () => { throw Error('offline') }]) {
    globalThis.fetch = async () => result()
    assert.equal((await onRequestPost({ request: request(valid), env })).status, 503)
  }
})

async function scriptHarness() {
  const code = await readFile(new URL('../scripts/apps-script/Code.gs', import.meta.url), 'utf8')
  const writes = []; let flushed = 0; let released = 0
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => ({ SIGNUP_SHARED_SECRET: env.SIGNUP_SHARED_SECRET, SPREADSHEET_ID: 'fake-sheet' })[key] }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() { return this } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => released++ }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (name) => name === 'signups' ? ({ getLastRow: () => 1, getRange: (...args) => ({ setNumberFormat: () => ({ setValues: (rows) => writes.push({ args, rows }) }) }) }) : null }), flush: () => flushed++ },
  }
  vm.createContext(context); vm.runInContext(code, context)
  return { run: (data) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(data) } }).text), writes, flushed: () => flushed, released: () => released }
}

test('Apps Script는 인증과 동의를 검증하고 수식 문자로 시작하는 이메일을 안전하게 저장한다', async () => {
  const h = await scriptHarness()
  assert.equal(h.run({ ...valid, secret: 'incorrect', consent_version: '1' }).ok, false)
  assert.equal(h.run({ ...valid, secret: env.SIGNUP_SHARED_SECRET, consent: false, consent_version: '1' }).ok, false)
  assert.equal(h.writes.length, 0)
  assert.equal(h.run({ email: '=test@example.com', stage: '', consent: true, consent_version: '1', secret: env.SIGNUP_SHARED_SECRET }).ok, true)
  assert.equal(h.writes[0].rows[0][1], "'=test@example.com")
  assert.equal(h.flushed(), 1); assert.equal(h.released(), 1)
})
