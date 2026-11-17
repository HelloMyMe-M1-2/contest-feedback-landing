import { useEffect, useState } from 'react'
import { isLabMessage, openLabChannel } from '../analytics/labChannel'
import type { LabMessage } from '../analytics/labChannel'

/** 실제 랜딩과 분리된 개발자 로컬 테스트 화면입니다. */
export function AnalyticsLab() {
  const [messages, setMessages] = useState<LabMessage[]>([])
  const [channelAvailable, setChannelAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    const channel = openLabChannel()
    setChannelAvailable(channel !== null)
    if (!channel) return
    const onMessage = (message: MessageEvent<unknown>) => {
      if (!isLabMessage(message.data)) return
      setMessages((current) => [...current, message.data as LabMessage].slice(-100))
    }
    channel.addEventListener('message', onMessage)
    return () => {
      channel.removeEventListener('message', onMessage)
      channel.close()
    }
  }, [])

  const latest = messages.at(-1)
  const latestTime = [...messages].reverse().find(({ event }) => event.event_name === 'visibility_checkpoint')
  const checkpoint = latestTime?.event.event_name === 'visibility_checkpoint' ? latestTime.event.properties : null

  return (
    <main className="analytics-lab" aria-labelledby="analytics-lab-title">
      <p className="lab-kicker">DEVELOPER TEST · LOCAL ONLY</p>
      <h1 id="analytics-lab-title">이벤트 실습장</h1>
      <p className="lab-intro">이 화면을 먼저 열어 둔 뒤 랜딩페이지에서 행동해 보세요. 방문과 버튼 클릭 등의 테스트 기록이 이곳에 표시됩니다.</p>
      <div className="lab-callout">
        <p><strong>브라우저 메모리에서만 확인</strong> · 같은 브라우저 프로필에서 호스트와 포트가 같은 탭만 연결됩니다. 실습장을 열기 전에 발생한 기록은 보이지 않으며, 새로고침하면 목록이 지워집니다.</p>
        <p>실제 기획안, 이메일이나 개인정보를 입력하거나 URL에 넣지 마세요.</p>
      </div>
      <div className="lab-actions">
        <a className="lab-open" href="/?analytics_lab=1&utm_content=post_001" target="_blank" rel="noopener">랜딩페이지 열기 <span aria-hidden="true">↗</span></a>
        <a className="lab-open lab-open-secondary" href="/?analytics_lab=1&posthog_test=1&utm_content=post_001" target="_blank" rel="noopener">PostHog 테스트로 열기 <span aria-hidden="true">↗</span></a>
      </div>
      <p className="lab-hint">첫 번째 버튼은 PostHog로 전송하지 않습니다. 두 번째 버튼은 별도 설정이 맞으면 가상 이벤트를 PostHog로 전송합니다. 전송 시도는 도착을 보장하지 않습니다.</p>
      {channelAvailable === false && <p className="lab-error" role="alert">이 브라우저에서 탭 간 실습 기록을 연결할 수 없습니다. 같은 브라우저의 일반 창에서 다시 시도해 주세요.</p>}
      <div className="lab-summary" aria-live="polite">
        <div><span>받은 이벤트</span><strong>{messages.length}건</strong><small>최근 최대 100건</small></div>
        <div><span>마지막 테스트 모드</span><strong>{latest ? (latest.posthogTestEnabled ? 'PostHog 전송 시도' : '로컬에서만 확인') : '이벤트 대기 중'}</strong><small>실제 도착 여부와 다를 수 있음</small></div>
      </div>
      <section className="lab-time" aria-labelledby="lab-time-title">
        <h2 id="lab-time-title">랜딩페이지 체류 시간</h2>
        {checkpoint && latestTime ? <p>경과 시간 <strong>{Math.floor(checkpoint.elapsed_ms / 1000)}초</strong> · 화면 표시 시간 <strong>{Math.floor(checkpoint.visible_ms / 1000)}초</strong> <small>페이지 ID: {latestTime.event.page_view_id}</small></p> : <p>아직 시간 기록을 받지 못했습니다.</p>}
        <p className="lab-hint">랜딩 탭에서 약 15초마다, 탭을 숨기거나 닫을 때 누적값을 받습니다. 마지막으로 받은 페이지의 값이며 실제로 읽었는지를 뜻하지 않습니다.</p>
      </section>
      <section className="lab-events" aria-labelledby="lab-events-title">
        <div className="lab-events-header"><div><p className="lab-kicker">EVENT LOG</p><h2 id="lab-events-title">받은 테스트 기록</h2></div><button type="button" onClick={() => setMessages([])}>목록 비우기</button></div>
        <p className="lab-hint">이 화면의 목록만 지웁니다. PostHog에 이미 전송된 이벤트는 삭제되지 않습니다. 서로 다른 페이지 방문은 페이지 ID로 구분합니다.</p>
        {messages.length === 0 ? <p className="lab-empty">아직 받은 기록이 없습니다. 위에서 랜딩페이지를 새 탭으로 열어 주세요.</p> : (
          <ol aria-label="기록된 실습 이벤트">
            {[...messages].reverse().map(({ event, posthogTestEnabled }, index) => (
              <li key={`${event.page_view_id}-${event.occurred_at}-${messages.length - index}`}>
                <div className="lab-event-title"><strong>{event.event_name}</strong><span>{posthogTestEnabled ? 'PostHog 전송 시도' : '로컬 전용'}</span></div>
                <pre>{JSON.stringify({ page_view_id: event.page_view_id, device_category: event.device_category, properties: event.properties, campaign: event.campaign, occurred_at: event.occurred_at }, null, 2)}</pre>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
