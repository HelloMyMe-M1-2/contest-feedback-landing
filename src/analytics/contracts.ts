/** UI 모양이 아니라 사용자의 행동을 기준으로 정의한 이벤트입니다. */
export type ExampleId = 'problem' | 'operation' | 'effect'
export type EventProperties = {
  landing_viewed: Record<string, never>
  example_exposed: { example_id: ExampleId }
  example_selected: { example_id: ExampleId }
  purchase_offer_viewed: { offer_id: string; price_status: 'not_set' | 'specified' }
  purchase_clicked: { offer_id: string; price_status: 'not_set' | 'specified' }
  availability_notice_viewed: { notice_version: string }
  registration_started: { form_version: string }
  registration_completed: { form_version: string; result: 'new' | 'duplicate' }
  scroll_depth_reached: { depth: 25 | 50 | 75 | 100 }
  visibility_checkpoint: { visible_delta_ms: number; sequence: number }
  general_click: { target_category: 'button' | 'link' | 'other' }
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
    occurred_at: string
    event_schema_version: '1'
  }
}[K]
