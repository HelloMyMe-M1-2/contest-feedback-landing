import type { AnalyticsEvent, Campaign, EventProperties } from './contracts'

export interface EventSink {
  send(event: AnalyticsEvent): void
}

/** 실제 서비스는 연결하지 않습니다. 호출돼도 네트워크로 전송하지 않습니다. */
export const disabledSink: EventSink = { send: () => {} }

export function createTracker(campaign: Campaign, sink: EventSink = disabledSink, context: { pageViewId: string; deviceCategory: AnalyticsEvent['device_category'] } = { pageViewId: 'disabled', deviceCategory: 'unknown' }) {
  return {
    track<K extends keyof EventProperties>(eventName: K, properties: EventProperties[K]) {
      const event = {
        event_name: eventName,
        properties,
        campaign,
        page_view_id: context.pageViewId,
        device_category: context.deviceCategory,
        occurred_at: new Date().toISOString(),
        event_schema_version: '2',
      } as AnalyticsEvent<K>
      try {
        sink.send(event as AnalyticsEvent)
      } catch {
        // 분석 도구가 실패해도 예시 선택이나 구매 안내는 계속 작동해야 합니다.
        // 이벤트 내용과 오류 객체에는 민감한 정보가 있을 수 있어 출력하지 않습니다.
        console.warn('이벤트 기록에 실패했습니다. 화면 동작은 계속됩니다.')
      }
    },
  }
}
