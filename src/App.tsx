import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnalyticsLab } from './components/AnalyticsLab'
import { ExamplePreview } from './components/ExamplePreview'
import { readCampaign } from './analytics/campaign'
import { createTracker, disabledSink } from './analytics/tracker'
import { useExposure } from './analytics/useExposure'
import { shouldEnableLab } from './analytics/lab'
import type { AnalyticsEvent, ExampleId } from './analytics/contracts'
import type { EventSink } from './analytics/tracker'

/** 팀의 디자인이 정해지기 전, 기능을 확인하기 위한 최소 화면입니다. */
export default function App() {
  const [noticeVisible, setNoticeVisible] = useState(false)
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const offerRef = useRef<HTMLElement>(null)
  const pageViewed = useRef(false)
  const campaign = useMemo(() => readCampaign(window.location.search), [])
  const labEnabled = shouldEnableLab(import.meta.env.DEV, window.location.hostname, window.location.search)
  const sink = useMemo<EventSink>(() => labEnabled ? {
    send: (event) => setEvents((current) => [...current, event].slice(-100)),
  } : disabledSink, [labEnabled])
  const tracker = useMemo(() => createTracker(campaign, sink), [campaign, sink])

  useEffect(() => {
    if (!pageViewed.current) {
      pageViewed.current = true
      tracker.track('landing_viewed', {})
    }
  }, [tracker])
  useEffect(() => {
    if (noticeVisible) tracker.track('availability_notice_viewed', { notice_version: '1' })
  }, [noticeVisible, tracker])
  useExposure(offerRef, 'unconfigured', () => tracker.track('purchase_offer_viewed', { offer_id: 'unconfigured', price_status: 'not_set' }))
  const onSelect = useCallback((id: ExampleId) => tracker.track('example_selected', { example_id: id }), [tracker])
  const onExposed = useCallback((id: ExampleId) => tracker.track('example_exposed', { example_id: id }), [tracker])

  return (
    <main>
      <header>
        <p>기능 확인용 임시 화면</p>
        <h1>공모전 기획안 피드백</h1>
        <p>제출 전 기획안의 확인할 부분과 그 이유를 보여주는 서비스를 구상하고 있습니다.</p>
      </header>
      <ExamplePreview onSelect={onSelect} onExposed={onExposed} />
      <section ref={offerRef} aria-labelledby="purchase-title">
        <h2 id="purchase-title">서비스 안내</h2>
        <p>가격과 제공 범위는 아직 정해지지 않았습니다. 서비스와 결제는 준비 중입니다.</p>
        <button type="button" onClick={() => {
          tracker.track('purchase_clicked', { offer_id: 'unconfigured', price_status: 'not_set' })
          setNoticeVisible(true)
        }}>구매하기</button>
        {noticeVisible && <p role="status">서비스와 결제 기능은 준비 중입니다. 결제나 신청은 완료되지 않았습니다.</p>}
      </section>
      {labEnabled && <AnalyticsLab events={events} onClear={() => setEvents([])} />}
    </main>
  )
}
