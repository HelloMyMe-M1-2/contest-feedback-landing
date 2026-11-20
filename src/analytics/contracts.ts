/** UI 모양이 아니라 사용자의 행동을 기준으로 정의한 이벤트입니다. */
export type ExampleId = 'problem' | 'operation' | 'effect'
export type EventProperties = {
  landing_viewed: Record<string, never>
  sample_report_viewed: { sample_version: string }
  sample_interacted: { action: 'expand' | 'zoom' | 'section'; section_id: 'overview' | 'criteria' | 'strengths' | 'basic' | 'weaknesses' | 'questions' | 'deep' | 'none' }
  cta_clicked: { target: 'sample' | 'signup'; location: 'header' | 'drawer' | 'hero' | 'how' | 'toc' | 'after-sample' | 'mbar' }
  example_exposed: { example_id: ExampleId; example_version: string }
  example_selected: { example_id: ExampleId; example_version: string }
  purchase_offer_viewed: { offer_id: string; offer_version: string; price_status: 'not_set' | 'specified' }
  purchase_clicked: { offer_id: string; offer_version: string; price_status: 'not_set' | 'specified' }
  availability_notice_viewed: { notice_version: string }
  registration_started: { form_version: string }
  registration_completed: { form_version: string; result: 'new' | 'duplicate' }
  scroll_depth_reached: { depth: 25 | 50 | 75 | 100 }
  visibility_checkpoint: { visible_ms: number; elapsed_ms: number; click_count: number; sequence: number; trigger: 'interval' | 'hidden' | 'pagehide' }
}

export type Campaign = {
  post_id: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
}

export type AnalyticsEvent<K extends keyof EventProperties = keyof EventProperties> = {
  [P in K]: {
    event_name: P
    properties: EventProperties[P]
    campaign: Campaign
    page_view_id: string
    device_category: 'mobile' | 'desktop' | 'other' | 'unknown'
    occurred_at: string
    event_schema_version: '2'
  }
}[K]
