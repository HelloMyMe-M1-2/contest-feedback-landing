import type { AnalyticsEvent, Campaign, EventProperties } from './contracts'

export interface EventSink {
  send(event: AnalyticsEvent): void
}

/** 실제 서비스는 연결하지 않습니다. 호출돼도 네트워크로 전송하지 않습니다. */
export const disabledSink: EventSink = { send: () => {} }

export function createTracker(campaign: Campaign, sink: EventSink = disabledSink) {
  return {
    track<K extends keyof EventProperties>(eventName: K, properties: EventProperties[K]) {
      const event = {
        event_name: eventName,
        properties,
        campaign,
        occurred_at: new Date().toISOString(),
        event_schema_version: '1',
      } as AnalyticsEvent<K>
      sink.send(event as AnalyticsEvent)
    },
  }
}
