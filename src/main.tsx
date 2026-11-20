import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './plancheck/Prototype'
import type { EventSink } from './analytics/tracker'
import { shouldShowLabViewer } from './analytics/lab'


async function start() {
  if (import.meta.env.DEV && shouldShowLabViewer(true, window.location.hostname, window.location.pathname)) {
    const { AnalyticsLab } = await import('./components/AnalyticsLab')
    createRoot(document.getElementById('root')!).render(<StrictMode><AnalyticsLab /></StrictMode>)
    return
  }
  let testSink: EventSink | undefined
  if (import.meta.env.DEV) {
    try {
      const { initPosthogTest } = await import('./analytics/posthogTest')
      testSink = initPosthogTest()
    } catch {
      // 선택적 테스트 도구가 불러와지지 않아도 화면을 표시합니다.
      console.warn('PostHog 테스트를 시작하지 못했습니다. 화면은 계속 사용할 수 있습니다.')
    }
  }
  createRoot(document.getElementById('root')!).render(<App testSink={testSink} />)
}

void start()
