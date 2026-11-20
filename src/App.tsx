import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './plancheck.css'
import { SignupForm } from './components/SignupForm'
import { ExamplePreview } from './components/ExamplePreview'
import { readCampaign } from './analytics/campaign'
import { createTracker, disabledSink } from './analytics/tracker'
import { useExposure } from './analytics/useExposure'
import { shouldEnableLab } from './analytics/lab'
import { openLabChannel } from './analytics/labChannel'
import { classifyDevice } from './analytics/pageMetrics'
import { usePageMetrics } from './analytics/usePageMetrics'
import type { ExampleId } from './analytics/contracts'
import type { EventSink } from './analytics/tracker'

/** 팀의 디자인이 정해지기 전, 기능을 확인하기 위한 최소 화면입니다. */
export default function App({ testSink }: { testSink?: EventSink }) {
  const [noticeVisible, setNoticeVisible] = useState(false)
  const labChannel = useRef<BroadcastChannel | null>(null)
  const offerRef = useRef<HTMLElement>(null)
  const pageViewed = useRef(false)
  const campaign = useMemo(() => readCampaign(window.location.search), [])
  const labEnabled = shouldEnableLab(import.meta.env.DEV, window.location.hostname, window.location.search)
  const context = useMemo(() => ({ pageViewId: labEnabled ? crypto.randomUUID() : 'disabled', deviceCategory: labEnabled ? classifyDevice(navigator.userAgent) : 'unknown' as const }), [labEnabled])
  const sink = useMemo<EventSink>(() => labEnabled ? {
    send: (event) => {
      // 별도 실습장이 닫혔거나 탭 간 전달이 실패해도 PostHog 테스트와 화면은 계속 동작합니다.
      try {
        labChannel.current?.postMessage({ type: 'event', event, posthogTestEnabled: Boolean(testSink) })
      } catch {
        console.warn('로컬 실습장으로 이벤트를 전달하지 못했습니다.')
      }
      testSink?.send(event)
    },
  } : disabledSink, [labEnabled, testSink])
  const tracker = useMemo(() => createTracker(campaign, sink, context), [campaign, sink, context])

  useEffect(() => {
    if (!labEnabled) return
    const channel = openLabChannel()
    labChannel.current = channel
    return () => {
      labChannel.current = null
      channel?.close()
    }
  }, [labEnabled])
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
    <main className="plancheck" data-analytics-content>
      <header className="pc-header pc-wrap"><a className="pc-brand" href="#top">PLAN<span>:</span>CHECK</a><nav aria-label="주 메뉴"><a href="#empathy">공감하기</a><a href="#how">이용 방법</a><a href="#example">샘플 리포트</a><a href="#faq">FAQ</a></nav><a className="pc-nav-cta" href="#offer">구매하기</a></header>
      <section className="pc-hero" id="top"><div className="pc-wrap pc-hero-grid"><div><span className="pc-pill">제출 전 기획안 피드백</span><h1>더 이상 고칠 곳이<br />없는 기획안에,<br /><em>무엇이 부족할까?</em></h1><p>공모전 제출 전, 놓친 부분과 그 이유를<br />점검 기준과 함께 확인해 보세요.</p><a className="pc-white-btn" href="#example">샘플 리포트 먼저 보기 <span>↗</span></a><div className="pc-hero-note">서비스 준비 중 · 아래 내용은 가상의 예시입니다</div></div><div className="pc-card"><div className="pc-card-top"><b>기획안 분석 리포트</b><span>샘플</span></div><div className="pc-score"><span>종합 점수<br /><strong>B+</strong></span><b>76<small> / 100</small></b></div><div className="pc-insight"><b>핵심 인사이트</b><p>아이디어는 좋지만 실행 계획의 구체성을 더 살펴볼 수 있어요.</p></div><small>이 점수와 내용은 이해를 돕기 위한 가상 예시입니다.</small></div></div></section>
      <section className="pc-section pc-empathy" id="empathy"><div className="pc-wrap"><span className="pc-eyebrow">01 공감</span><h2>기획안을 다듬을 때,<br />이런 순간이 있지 않나요?</h2><p className="pc-sub">제출 전에는 내 눈에 보이지 않던 부분이 궁금해져요.</p><div className="pc-three"><article><span>01</span><h3>이 정도면 괜찮은 것 같은데</h3><p>처음 보는 사람에게도 기획의 의도가 잘 전달될까요?</p></article><article><span>02</span><h3>AI의 답변을 받았지만</h3><p>어떤 기준으로 피드백을 받아들여야 할지 고민돼요.</p></article><article><span>03</span><h3>다른 관점이 필요할 때</h3><p>놓친 부분과 그 이유를 함께 확인하고 싶어요.</p></article></div></div></section>
      <section className="pc-section pc-how" id="how"><div className="pc-wrap"><span className="pc-eyebrow">02 이용 방법</span><h2>이런 흐름을 준비하고 있어요</h2><p className="pc-sub">기획안을 기준에 비춰 살펴보고 피드백을 확인하는 과정을 구상 중이에요.</p><div className="pc-three"><article><span>01</span><div className="pc-icon">↥</div><h3>기획안 살펴보기</h3><p>제출 전 점검하고 싶은 기획안을 준비해요.</p></article><article><span>02</span><div className="pc-icon">⌕</div><h3>기준에 비춰 확인하기</h3><p>확인할 부분과 참고한 기준을 살펴봐요.</p></article><article><span>03</span><div className="pc-icon">✓</div><h3>리포트 확인하기</h3><p>부족한 점과 그 이유를 함께 확인해요.</p></article></div><p className="pc-note">실제 기획안 업로드와 자동 분석은 아직 제공하지 않습니다.</p></div></section>
      <section className="pc-section pc-sample" aria-labelledby="sample-title"><div className="pc-wrap"><span className="pc-eyebrow">03 샘플 리포트</span><h2 id="sample-title">리포트를 미리 살펴보세요</h2><p className="pc-sub">가상의 기획안으로 만든 예시입니다. 점수와 내용은 실제 심사 결과가 아닙니다.</p><details className="pc-report"><summary>샘플 리포트 이미지 보기 <span>＋</span></summary><img src="/assets/sample-report.jpg" alt="가상 기획안을 바탕으로 작성한 샘플 리포트" /></details></div><ExamplePreview onSelect={onSelect} onExposed={onExposed} /></section>
      <section className="pc-section pc-offer" id="offer" ref={offerRef}><div className="pc-wrap pc-offer-grid"><div><span className="pc-eyebrow">04 서비스 안내</span><h2 id="purchase-title">내 기획안도<br /><em>점검받고 싶다면</em></h2><p>제출 전에 기획안의 부족한 부분과 그 이유를 확인할 수 있는 서비스를 준비하고 있어요.</p><ul><li>확인할 부분과 이유</li><li>참고한 점검 기준</li><li>기획안을 다시 살펴볼 질문</li></ul></div><div><SignupForm onStart={() => tracker.track('registration_started', { form_version: '1' })} onComplete={() => tracker.track('registration_completed', { form_version: '1', result: 'new' })} /><div className="pc-offer-card"><h3>피드백 리포트</h3><p>가격과 제공 범위는 아직 정해지지 않았습니다.</p><button type="button" onClick={() => { tracker.track('purchase_clicked', { offer_id: 'unconfigured', offer_version: '1', price_status: 'not_set' }); setNoticeVisible(true) }}>구매하기 <span>→</span></button><small>실제 결제는 진행되지 않습니다.</small>{noticeVisible && <p className="pc-notice" role="status">서비스와 결제 기능은 준비 중입니다. 결제나 신청은 완료되지 않았습니다.</p>}</div></div></div></section>
      <section className="pc-section pc-faq" id="faq"><div className="pc-wrap pc-faq-grid"><div><span className="pc-eyebrow">FAQ</span><h2>자주 묻는 질문</h2></div><div><details><summary>어떤 서비스를 준비하고 있나요?</summary><p>아이디어·기획 공모전 제출 전 기획안을 점검하는 피드백 리포트를 구상하고 있습니다.</p></details><details><summary>샘플은 실제 분석 결과인가요?</summary><p>아니요. 샘플은 이해를 돕기 위한 가상의 예시입니다.</p></details><details><summary>지금 기획안을 올릴 수 있나요?</summary><p>아직 업로드와 실제 분석은 제공하지 않습니다.</p></details><details><summary>구매하기를 누르면 결제되나요?</summary><p>아니요. 서비스와 결제 기능은 준비 중이며 실제 결제는 이뤄지지 않습니다.</p></details></div></div></section>
      <footer className="pc-footer pc-wrap"><b>PLAN:CHECK</b><span>제출 전, 기획안을 한 번 더 살펴보는 시간</span><small>서비스 준비 중 · 가상의 예시입니다</small></footer>
    </main>
  )
}
