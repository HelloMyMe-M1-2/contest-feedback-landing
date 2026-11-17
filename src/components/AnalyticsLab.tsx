import type { AnalyticsEvent } from '../analytics/contracts'
import { useEffect, useState } from 'react'
import { createVisitClock } from '../analytics/visitClock'

type Props = { events: AnalyticsEvent[]; onClear: () => void }

/** 개발 서버와 로컬 주소, 명시적인 쿼리에서만 부모가 표시합니다. */
export function AnalyticsLab({ events, onClear }: Props) {
  const [time, setTime] = useState({ elapsedMs: 0, visibleMs: 0 })

  useEffect(() => {
    const clock = createVisitClock(performance.now(), document.visibilityState === 'visible')
    const update = () => setTime(clock.snapshot(performance.now()))
    const onVisibilityChange = () => {
      clock.setVisible(document.visibilityState === 'visible', performance.now())
      update()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    const interval = window.setInterval(update, 1000)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [])

  return (
    <aside className="analytics-lab" aria-labelledby="analytics-lab-title">
      <h2 id="analytics-lab-title">이벤트 실습장 · 이 화면에서만 보기</h2>
      <p>브라우저 메모리에만 기록합니다. PostHog나 서버에 전송하지 않으며, 새로고침하면 사라집니다.</p>
      <p>페이지를 연 뒤 경과 시간: <strong>{Math.floor(time.elapsedMs / 1000)}초</strong> · 화면에 표시된 시간: <strong>{Math.floor(time.visibleMs / 1000)}초</strong></p>
      <p>탭을 바꾸면 표시 시간은 멈춥니다. 화면이 표시되어도 실제로 읽었는지는 알 수 없습니다. 실습장 표시용이며 기록으로 저장되지 않습니다.</p>
      <p>이벤트: <strong>{events.length}건</strong> · 방문자 수나 세션 수는 아직 계산하지 않습니다.</p>
      <button type="button" onClick={onClear}>실습 기록 비우기</button>
      {events.length === 0 ? <p>기록된 이벤트가 없습니다.</p> : (
        <ol aria-label="기록된 실습 이벤트">
          {[...events].reverse().map((event, index) => (
            <li key={`${event.occurred_at}-${events.length - index}`}>
              <strong>{event.event_name}</strong>
              <pre>{JSON.stringify({ properties: event.properties, campaign: event.campaign, occurred_at: event.occurred_at }, null, 2)}</pre>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
