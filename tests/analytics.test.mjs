import test from 'node:test'
import assert from 'node:assert/strict'
import { readCampaign } from '../src/analytics/campaign.ts'
import { createTracker } from '../src/analytics/tracker.ts'
import { shouldEnableLab, shouldShowLabViewer } from '../src/analytics/lab.ts'
import { isLabMessage, openLabChannel } from '../src/analytics/labChannel.ts'
import { createVisitClock } from '../src/analytics/visitClock.ts'
import { canSendPosthogPreview, canSendPosthogTest, filterPosthogTestEvent, testEventProperties } from '../src/analytics/posthogTestPolicy.ts'
import { classifyDevice, newlyReachedDepths } from '../src/analytics/pageMetrics.ts'

test('게시글 식별자와 유입 매개변수를 분리하고 소문자로 기록한다', () => {
  assert.deepEqual(readCampaign('?utm_source=Linkareer&utm_medium=post&utm_campaign=Test_01&utm_content=post_001'), {
    post_id: 'post_001', utm_source: 'linkareer', utm_medium: 'post', utm_campaign: 'test_01',
  })
})

test('누락되거나 이메일·공백처럼 허용하지 않는 값은 unknown으로 처리한다', () => {
  assert.deepEqual(readCampaign('?utm_source=person%40example.com&utm_content=a%20b'), {
    post_id: 'unknown', utm_source: 'unknown', utm_medium: 'unknown', utm_campaign: 'unknown',
  })
})

test('선택한 예시는 지정된 수집기에만 전달되며 캠페인과 스키마를 포함한다', () => {
  const events = []
  const campaign = readCampaign('?utm_content=post_001')
  const tracker = createTracker(campaign, { send: (event) => events.push(event) }, { pageViewId: 'page-1', deviceCategory: 'mobile' })
  tracker.track('example_selected', { example_id: 'problem', example_version: '1' })
  assert.equal(events.length, 1)
  assert.equal(events[0].event_name, 'example_selected')
  assert.equal(events[0].campaign.post_id, 'post_001')
  assert.equal(events[0].properties.example_id, 'problem')
  assert.equal(events[0].event_schema_version, '2')
  assert.equal(events[0].page_view_id, 'page-1')
  assert.equal(events[0].device_category, 'mobile')
})

test('기본 수집기는 이벤트를 외부로 보내지 않는다', () => {
  assert.doesNotThrow(() => createTracker(readCampaign('')).track('landing_viewed', {}))
})

test('측정 도구가 실패해도 구매 클릭 이후의 화면 동작을 막지 않는다', () => {
  const tracker = createTracker(readCampaign(''), { send() { throw new Error('simulated failure') } })
  let noticeVisible = false
  const originalWarn = console.warn
  const warnings = []
  console.warn = (message) => warnings.push(message)
  try {
    tracker.track('purchase_clicked', { offer_id: 'unconfigured', offer_version: '1', price_status: 'not_set' })
    noticeVisible = true
  } finally {
    console.warn = originalWarn
  }
  assert.equal(noticeVisible, true)
  assert.equal(warnings.length, 1)
  assert.equal(warnings[0].includes('simulated failure'), false)
})

test('랜딩 테스트 기록은 개발 환경과 로컬 주소와 명시적 옵션이 모두 있어야 켜진다', () => {
  assert.equal(shouldEnableLab(true, '127.0.0.1', '?analytics_lab=1'), true)
  assert.equal(shouldEnableLab(true, 'localhost', '?analytics_lab=1'), true)
  assert.equal(shouldEnableLab(false, 'localhost', '?analytics_lab=1'), false)
  assert.equal(shouldEnableLab(true, 'example.com', '?analytics_lab=1'), false)
  assert.equal(shouldEnableLab(true, 'localhost', ''), false)
})

test('별도 실습장은 개발 환경의 로컬 전용 경로에서만 열린다', () => {
  assert.equal(shouldShowLabViewer(true, '127.0.0.1', '/__analytics'), true)
  assert.equal(shouldShowLabViewer(true, 'localhost', '/__analytics'), true)
  assert.equal(shouldShowLabViewer(false, 'localhost', '/__analytics'), false)
  assert.equal(shouldShowLabViewer(true, 'example.com', '/__analytics'), false)
  assert.equal(shouldShowLabViewer(true, 'localhost', '/'), false)
})

test('로컬 실습장과 랜딩 탭 사이에 이벤트가 전달된다', async () => {
  const receiver = openLabChannel()
  const sender = openLabChannel()
  assert.ok(receiver)
  assert.ok(sender)
  let timer
  try {
    const received = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('로컬 이벤트 수신 시간 초과')), 2000)
      receiver.addEventListener('message', (message) => resolve(message.data), { once: true })
    })
    const events = []
    createTracker(readCampaign(''), { send: (event) => events.push(event) }, { pageViewId: 'lab-page', deviceCategory: 'desktop' }).track('landing_viewed', {})
    sender.postMessage({ type: 'event', event: events[0], posthogTestEnabled: false })
    const value = await received
    assert.equal(isLabMessage(value), true)
    assert.equal(value.event.event_name, 'landing_viewed')
    assert.equal(value.event.page_view_id, 'lab-page')
    assert.equal(value.posthogTestEnabled, false)
    assert.equal(isLabMessage({ type: 'wrong' }), false)
  } finally {
    clearTimeout(timer)
    receiver.close()
    sender.close()
  }
})

test('경과 시간과 탭이 표시된 시간을 구분하며 탭 전환을 누적한다', () => {
  const clock = createVisitClock(0, true)
  clock.setVisible(false, 20000)
  assert.deepEqual(clock.snapshot(60000), { elapsedMs: 60000, visibleMs: 20000 })
  clock.setVisible(true, 60000)
  clock.setVisible(true, 61000)
  assert.deepEqual(clock.snapshot(65000), { elapsedMs: 65000, visibleMs: 25000 })
  clock.setVisible(false, 65000)
  clock.setVisible(false, 66000)
  assert.deepEqual(clock.snapshot(70000), { elapsedMs: 70000, visibleMs: 25000 })
})

test('숨겨진 상태에서 시작하면 표시될 때부터 시간을 센다', () => {
  const clock = createVisitClock(1000, false)
  clock.setVisible(true, 4000)
  assert.deepEqual(clock.snapshot(6000), { elapsedMs: 5000, visibleMs: 2000 })
})

test('PostHog 테스트는 개발 환경의 로컬 주소, 두 옵션, 토큰과 공식 호스트가 모두 필요하다', () => {
  const args = [true, 'localhost', '?analytics_lab=1&posthog_test=1', 'phc_test123', 'https://us.i.posthog.com']
  assert.equal(canSendPosthogTest(...args), true)
  for (const [index, value] of [[0, false], [1, 'example.com'], [2, '?analytics_lab=1'], [3, ''], [4, 'https://example.com']]) {
    const invalid = [...args]
    invalid[index] = value
    assert.equal(canSendPosthogTest(...invalid), false)
  }
})

test('배포 테스트는 활성 설정, 지정된 주소와 명시적 쿼리가 모두 있어야 켜진다', () => {
  const args = [false, 'true', 'contest-feedback-landing.pages.dev', '?posthog_preview=1', 'phc_test123', 'https://us.i.posthog.com']
  assert.equal(canSendPosthogPreview(...args), true)
  for (const [index, value] of [[0, true], [1, 'false'], [2, 'example.com'], [3, ''], [4, ''], [5, 'https://example.com']]) {
    const invalid = [...args]; invalid[index] = value
    assert.equal(canSendPosthogPreview(...invalid), false)
  }
  const event = { event_name: 'landing_viewed', properties: {}, campaign: { post_id: 'real_value', utm_source: 'real_value', utm_medium: 'real_value', utm_campaign: 'real_value' }, page_view_id: 'page-1', device_category: 'desktop', occurred_at: '2026-01-01', event_schema_version: '2' }
  assert.equal(testEventProperties(event, 'preview').test_environment, 'preview')
  assert.equal(testEventProperties(event, 'preview').post_id, 'test_unknown')
})

test('PostHog 테스트에서는 실제 유입 값을 보내지 않고 불필요한 SDK 속성과 이벤트를 제거한다', () => {
  const properties = testEventProperties({ event_name: 'example_selected', properties: { example_id: 'problem', example_version: '1' }, campaign: { post_id: 'actual', utm_source: 'actual', utm_medium: 'actual', utm_campaign: 'actual' }, page_view_id: 'page-1', device_category: 'mobile', occurred_at: '2026-01-01', event_schema_version: '2' })
  assert.equal(properties.post_id, 'test_unknown')
  const clean = filterPosthogTestEvent({ event: 'example_selected', properties: { ...properties, token: 'phc_test', distinct_id: 'id', price_status: 'specified', $current_url: 'https://example.com/private', $referrer: 'private' }, $set_once: { secret: 'private' } })
  assert.equal(clean.properties.example_id, 'problem')
  assert.equal(clean.properties.token, 'phc_test')
  assert.equal(clean.properties.$current_url, undefined)
  assert.equal(clean.properties.price_status, undefined) // 다른 이벤트에서만 허용하는 속성
  assert.equal(clean.properties.$geoip_disable, true)
  assert.equal(clean.$set_once, undefined)
  assert.equal(filterPosthogTestEvent({ event: '$autocapture', properties: {} }), null)
  const signup = filterPosthogTestEvent({ event: 'registration_completed', properties: { form_version: '1', result: 'new', email: 'person@example.com' } })
  assert.equal(signup.properties.result, 'new')
  assert.equal(signup.properties.email, undefined)
  const sample = filterPosthogTestEvent({ event: 'sample_interacted', properties: { action: 'section', section_id: 'criteria', text: 'private' } })
  assert.equal(sample.properties.section_id, 'criteria')
  assert.equal(sample.properties.text, undefined)
  assert.equal(filterPosthogTestEvent({ event: '__proto__', properties: {} }), null)
})

test('연습용 게시글 두 개만 고정된 테스트 식별자로 구분한다', () => {
  const events = []
  for (const postId of ['post_001', 'post_002', 'person_name']) {
    const tracker = createTracker(readCampaign(`?utm_content=${postId}`), { send: (event) => events.push(testEventProperties(event)) }, { pageViewId: 'page-1', deviceCategory: 'unknown' })
    tracker.track('landing_viewed', {})
  }
  assert.deepEqual(events.map((event) => event.post_id), ['test_post_001', 'test_post_002', 'test_unknown'])
})

test('스크롤은 새로 도달한 구간만 기록하고, 한 화면에 전부 보이는 페이지는 100%까지 도달한다', () => {
  const reached = new Set()
  assert.deepEqual(newlyReachedDepths(0, 300, 1200, reached), [25])
  assert.deepEqual(newlyReachedDepths(600, 300, 1200, reached), [50, 75])
  assert.deepEqual(newlyReachedDepths(300, 300, 1200, reached), [])
  assert.deepEqual(newlyReachedDepths(900, 300, 1200, reached), [100])
  assert.deepEqual(newlyReachedDepths(0, 800, 600, new Set()), [25, 50, 75, 100])
})

test('기기 분류는 원본 정보를 보내지 않고 불확실한 기기는 unknown으로 남긴다', () => {
  assert.equal(classifyDevice('Mozilla iPhone'), 'mobile')
  assert.equal(classifyDevice('Mozilla iPad'), 'other')
  assert.equal(classifyDevice('Mozilla Windows NT'), 'desktop')
  assert.equal(classifyDevice('unrecognized'), 'unknown')
})

test('테스트 수집기에 시간 누적값과 페이지 방문 ID가 보존된다', () => {
  const props = testEventProperties({ event_name: 'visibility_checkpoint', properties: { visible_ms: 12000, elapsed_ms: 20000, click_count: 2, sequence: 1, trigger: 'hidden' }, campaign: readCampaign(''), page_view_id: 'page-2', device_category: 'desktop', occurred_at: '2026-01-01', event_schema_version: '2' })
  const event = filterPosthogTestEvent({ event: 'visibility_checkpoint', properties: { ...props, token: 'phc_test', distinct_id: 'id' } })
  assert.equal(event.properties.visible_ms, 12000)
  assert.equal(event.properties.elapsed_ms, 20000)
  assert.equal(event.properties.click_count, 2)
  assert.equal(event.properties.page_view_id, 'page-2')
})
