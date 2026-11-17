import { useEffect, useRef } from 'react'
import { createVisitClock } from './visitClock'
import { newlyReachedDepths } from './pageMetrics'
import type { Depth } from './pageMetrics'
import type { EventProperties } from './contracts'

type Track = <K extends keyof EventProperties>(name: K, properties: EventProperties[K]) => void

/** 개발 실습에서만 사용. 누적값의 최댓값으로 방문별 시간을 집계합니다. */
export function usePageMetrics(enabled: boolean, track: Track) {
  const state = useRef<{ clock: ReturnType<typeof createVisitClock>; reached: Set<Depth>; clickCount: number; sequence: number } | null>(null)
  useEffect(() => {
    if (!enabled) return
    if (!state.current) state.current = { clock: createVisitClock(performance.now(), document.visibilityState === 'visible'), reached: new Set(), clickCount: 0, sequence: 0 }
    const current = state.current
    const checkpoint = (trigger: 'interval' | 'hidden' | 'pagehide') => {
      const snapshot = current.clock.snapshot(performance.now())
      current.sequence += 1
      track('visibility_checkpoint', { visible_ms: Math.floor(snapshot.visibleMs), elapsed_ms: Math.floor(snapshot.elapsedMs), click_count: current.clickCount, sequence: current.sequence, trigger })
    }
    const updateDepth = () => {
      if (document.visibilityState !== 'visible') return
      // 구매 영역의 위치가 아니라 실제 콘텐츠를 감싼 영역의 끝을 사용합니다.
      // 실습장은 이 영역 밖에 두므로 스크롤 깊이에 포함되지 않습니다.
      const content = document.querySelector('[data-analytics-content]')
      if (!content) return
      const pageEnd = content.getBoundingClientRect().bottom + window.scrollY
      for (const depth of newlyReachedDepths(window.scrollY, window.innerHeight, pageEnd, current.reached)) track('scroll_depth_reached', { depth })
    }
    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || !(event.target instanceof Element) || event.target.closest('[data-analytics-ignore]')) return
      current.clickCount += 1
    }
    const onVisibility = () => {
      const visible = document.visibilityState === 'visible'
      current.clock.setVisible(visible, performance.now())
      if (visible) updateDepth()
      else checkpoint('hidden')
    }
    const onPageHide = () => {
      current.clock.setVisible(false, performance.now())
      checkpoint('pagehide')
    }
    const onPageShow = () => {
      current.clock.setVisible(document.visibilityState === 'visible', performance.now())
      updateDepth()
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('scroll', updateDepth, { passive: true })
    window.addEventListener('resize', updateDepth)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') checkpoint('interval') }, 15000)
    updateDepth()
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('scroll', updateDepth)
      window.removeEventListener('resize', updateDepth)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      window.clearInterval(timer)
    }
  }, [enabled, track])
}
