import type { AnalyticsEvent, EventProperties } from './contracts'

// 새 이벤트가 계약에 추가되면 테스트 전송 허용 여부를 명시적으로 결정해야 합니다.
const testEvents = {
  landing_viewed: true,
  sample_report_viewed: true,
  sample_interacted: true,
  cta_clicked: true,
  example_exposed: true,
  example_selected: true,
  purchase_offer_viewed: true,
  purchase_clicked: true,
  availability_notice_viewed: true,
  registration_started: true,
  registration_completed: true,
  scroll_depth_reached: true,
  visibility_checkpoint: true,
} satisfies Record<keyof EventProperties, boolean>
// 속성이 바뀌면 이벤트별로 허용 여부를 명시해야 타입 검사를 통과합니다.
// false는 계약에 있지만 테스트 PostHog 전송에서는 제거한다는 뜻입니다.
type TestPropertyDecisions = { [K in keyof EventProperties]: { [P in keyof EventProperties[K]]: boolean } }
const testPropertyDecisions = {
  landing_viewed: {},
  sample_report_viewed: { sample_version: true },
  sample_interacted: { action: true, section_id: true },
  cta_clicked: { target: true, location: true },
  example_exposed: { example_id: true, example_version: true },
  example_selected: { example_id: true, example_version: true },
  purchase_offer_viewed: { offer_id: true, offer_version: true, price_status: true },
  purchase_clicked: { offer_id: true, offer_version: true, price_status: true },
  availability_notice_viewed: { notice_version: true },
  registration_started: { form_version: true },
  registration_completed: { form_version: true, result: true },
  scroll_depth_reached: { depth: true },
  visibility_checkpoint: { visible_ms: true, elapsed_ms: true, click_count: true, sequence: true, trigger: true },
} satisfies TestPropertyDecisions
const commonProperties = new Set(['token', 'distinct_id', '$session_id', '$window_id', '$lib', '$lib_version', '$process_person_profile', '$insert_id', 'test_environment', 'event_schema_version', 'page_view_id', 'device_category', 'post_id', 'utm_source', 'utm_medium', 'utm_campaign'])

/** 운영 빌드와 외부 주소에서는 설정값이 있어도 테스트 전송을 켜지 않습니다. */
export function canSendPosthogTest(isDevelopment: boolean, hostname: string, search: string, token: string, host: string): boolean {
  const params = new URLSearchParams(search)
  return isDevelopment
    && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    && params.get('analytics_lab') === '1'
    && params.get('posthog_test') === '1'
    && /^phc_[A-Za-z0-9_-]+$/.test(token)
    && ['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(host)
}

/** 미리 정한 두 게시글만 가상 식별자로 매핑하고 나머지는 unknown으로 보냅니다. */
export function testEventProperties(event: AnalyticsEvent): Record<string, unknown> {
  const postId = event.campaign.post_id === 'post_001' ? 'test_post_001'
    : event.campaign.post_id === 'post_002' ? 'test_post_002' : 'test_unknown'
  return {
    ...event.properties,
    test_environment: 'local',
    event_schema_version: event.event_schema_version,
    page_view_id: event.page_view_id,
    device_category: event.device_category,
    post_id: postId,
    utm_source: 'test_source',
    utm_medium: 'test_medium',
    utm_campaign: 'test_campaign',
  }
}

/** SDK가 추가하는 URL·referrer 등은 제거하고 명시한 이벤트만 허용합니다. */
export function filterPosthogTestEvent<T extends { event: string; properties?: Record<string, unknown>; uuid?: string; timestamp?: Date }>(event: T): T | null {
  if (!Object.hasOwn(testEvents, event.event) || !testEvents[event.event as keyof typeof testEvents]) return null
  const decisions: Record<string, boolean> = testPropertyDecisions[event.event as keyof typeof testPropertyDecisions]
  const properties: Record<string, unknown> = {
    ...Object.fromEntries(Object.entries(event.properties ?? {}).filter(([key]) => commonProperties.has(key) || (Object.hasOwn(decisions, key) && decisions[key]))),
    $geoip_disable: true,
  }
  return { event: event.event, properties, uuid: event.uuid, timestamp: event.timestamp } as T
}
