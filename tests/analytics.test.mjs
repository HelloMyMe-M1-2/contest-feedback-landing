import test from 'node:test'
import assert from 'node:assert/strict'
import { readCampaign } from '../src/analytics/campaign.ts'
import { createTracker } from '../src/analytics/tracker.ts'
import { shouldEnableLab } from '../src/analytics/lab.ts'
import { createVisitClock } from '../src/analytics/visitClock.ts'

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
  const tracker = createTracker(campaign, { send: (event) => events.push(event) })
  tracker.track('example_selected', { example_id: 'problem' })
  assert.equal(events.length, 1)
  assert.equal(events[0].event_name, 'example_selected')
  assert.equal(events[0].campaign.post_id, 'post_001')
  assert.equal(events[0].properties.example_id, 'problem')
  assert.equal(events[0].event_schema_version, '1')
})

test('기본 수집기는 이벤트를 외부로 보내지 않는다', () => {
  assert.doesNotThrow(() => createTracker(readCampaign('')).track('landing_viewed', {}))
})

test('실습장은 개발 환경과 로컬 주소와 명시적 옵션이 모두 있어야 열린다', () => {
  assert.equal(shouldEnableLab(true, '127.0.0.1', '?analytics_lab=1'), true)
  assert.equal(shouldEnableLab(true, 'localhost', '?analytics_lab=1'), true)
  assert.equal(shouldEnableLab(false, 'localhost', '?analytics_lab=1'), false)
  assert.equal(shouldEnableLab(true, 'example.com', '?analytics_lab=1'), false)
  assert.equal(shouldEnableLab(true, 'localhost', ''), false)
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
