import type { AnalyticsEvent } from './contracts'

/** 같은 브라우저·같은 출처의 로컬 테스트 탭 사이에서만 전달합니다. */
export const LAB_CHANNEL_NAME = 'contest-feedback-local-analytics-v1'

export type LabMessage = {
  type: 'event'
  event: AnalyticsEvent
  posthogTestEnabled: boolean
}

export function openLabChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(LAB_CHANNEL_NAME)
  } catch {
    return null
  }
}

/** 다른 출처와는 분리되며, 같은 출처에서 온 잘못된 형식에도 화면이 깨지지 않게 합니다. */
export function isLabMessage(value: unknown): value is LabMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<LabMessage>
  return message.type === 'event'
    && typeof message.posthogTestEnabled === 'boolean'
    && !!message.event
    && typeof message.event === 'object'
    && typeof message.event.event_name === 'string'
    && typeof message.event.page_view_id === 'string'
}
