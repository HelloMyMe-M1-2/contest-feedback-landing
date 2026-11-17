import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnalyticsLab } from './components/AnalyticsLab'
import { ExamplePreview } from './components/ExamplePreview'
import { readCampaign } from './analytics/campaign'
import { createTracker, disabledSink } from './analytics/tracker'
import { useExposure } from './analytics/useExposure'
import { shouldEnableLab } from './analytics/lab'
import { classifyDevice } from './analytics/pageMetrics'
import { usePageMetrics } from './analytics/usePageMetrics'
import type { AnalyticsEvent, ExampleId } from './analytics/contracts'
import type { EventSink } from './analytics/tracker'

/** 팀의 디자인이 정해지기 전, 기능을 확인하기 위한 최소 화면입니다. */
export default function App({ testSink }: { testSink?: EventSink }) {
  const [noticeVisible, setNoticeVisible] = useState(false)
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const offerRef = useRef<HTMLElement>(null)
  const pageViewed = useRef(false)
  const campaign = useMemo(() => readCampaign(window.location.search), [])
  const labEnabled = shouldEnableLab(import.meta.env.DEV, window.location.hostname, window.location.search)
  const context = useMemo(() => ({ pageViewId: labEnabled ? crypto.randomUUID() : 'disabled', deviceCategory: labEnabled ? classifyDevice(navigator.userAgent) : 'unknown' as const }), [labEnabled])
  const sink = useMemo<EventSink>(() => labEnabled ? {
    send: (event) => {
      setEvents((current) => [...current, event].slice(-100))
      testSink?.send(event)
    },
  } : disabledSink, [labEnabled, testSink])
  const tracker = useMemo(() => createTracker(campaign, sink, context), [campaign, sink, context])

  useEffect(() => {
    if (!pageViewed.current) {
      pageViewed.current = true
      tracker.track('landing_viewed', {})
    }
  }, [tracker])
  useEffect(() => {
    if (noticeVisible) tracker.track('availability_notice_viewed', { notice_version: '1' })
  }, [noticeVisible, tracker])
  usePageMetrics(labEnabled, tracker.track)
  useExposure(offerRef, 'unconfigured', () => tracker.track('purchase_offer_viewed', { offer_id: 'unconfigured', offer_version: '1', price_status: 'not_set' }))
  const onSelect = useCallback((id: ExampleId) => tracker.track('example_selected', { example_id: id, example_version: '1' }), [tracker])
  const onExposed = useCallback((id: ExampleId) => tracker.track('example_exposed', { example_id: id, example_version: '1' }), [tracker])

  return (
    <main>
      <div data-analytics-content>
        <header className="site-header">
          <a className="brand" href="#top" aria-label="다음장 페이지 처음으로">
            <span className="brand-mark" aria-hidden="true">ㄷ</span>
            <span>다음장<span className="brand-dot">.</span></span>
          </a>
          <a className="header-link" href="#example">피드백 예시 보기 <span aria-hidden="true">↗</span></a>
        </header>

        <section className="hero section-wrap" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> 공모전 기획안을 위한 피드백</span>
            <h1 id="hero-title">제출 전, 내 기획안을<br /><span>한 번 더 살펴볼 시간.</span></h1>
            <p className="hero-description">열심히 완성한 기획안. 놓친 부분은 없는지, 근거는 충분한지 함께 살펴볼 수 있는 피드백을 준비하고 있어요.</p>
            <a className="primary-link" href="#example">피드백 예시 살펴보기 <span aria-hidden="true">↗</span></a>
            <p className="hero-note">현재 서비스는 준비 중이며, 아래 내용은 가상의 예시입니다.</p>
          </div>
          <div className="hero-visual" aria-label="기획안을 살펴보는 세 가지 질문">
            <div className="paper">
              <div className="paper-top"><span>BEFORE SUBMIT</span><span>01 — 03</span></div>
              <p className="paper-label">제출 전 체크</p>
              <p className="paper-title">좋은 아이디어를<br />더 설득력 있게.</p>
              <div className="paper-rule" />
              <div className="paper-question"><span>01</span><p>문제와 대상이 명확한가요?</p></div>
              <div className="paper-question"><span>02</span><p>주장을 뒷받침할 근거가 있나요?</p></div>
              <div className="paper-question"><span>03</span><p>실행 과정을 그려볼 수 있나요?</p></div>
              <div className="paper-bottom"><span>YOUR NEXT DRAFT</span><span>↗</span></div>
            </div>
            <span className="visual-caption">아이디어를 조금 더 단단하게 만드는 질문</span>
          </div>
        </section>

        <div className="section-divider section-wrap"><span>01 / SAMPLE REPORT</span><span>가상의 피드백 예시</span></div>
        <ExamplePreview onSelect={onSelect} onExposed={onExposed} />
        <section className="offer section-wrap" ref={offerRef} aria-labelledby="purchase-title">
          <div className="offer-inner">
            <div>
              <span className="offer-label">BEFORE YOUR NEXT DRAFT</span>
              <h2 id="purchase-title">더 나은 기획안을 위한<br />다음 단계를 준비하고 있어요.</h2>
              <p>가격과 제공 범위는 아직 정해지지 않았습니다.<br />서비스와 결제 기능은 현재 준비 중입니다.</p>
            </div>
            <div className="offer-action">
              <button className="purchase-button" type="button" onClick={() => {
                tracker.track('purchase_clicked', { offer_id: 'unconfigured', offer_version: '1', price_status: 'not_set' })
                setNoticeVisible(true)
              }}>구매하기 <span aria-hidden="true">↗</span></button>
              <span>실제 결제는 진행되지 않습니다.</span>
            </div>
          </div>
          {noticeVisible && <p className="availability-notice" role="status">서비스와 결제 기능은 준비 중입니다. 결제나 신청은 완료되지 않았습니다.</p>}
        </section>
        <footer className="site-footer section-wrap"><span className="footer-brand">다음장<span>.</span></span><p>제출 전, 한 번 더 생각해보는 시간.</p><small>서비스 준비 중 · 본 화면은 테스트용 시안입니다.</small></footer>
      </div>
      {labEnabled && <AnalyticsLab events={events} onClear={() => setEvents([])} posthogTestEnabled={Boolean(testSink)} />}
    </main>
  )
}
