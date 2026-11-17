/** 실습장 전용 계산기. 시간은 단조 증가하는 밀리초를 전달받습니다. */
export function createVisitClock(start: number, initiallyVisible: boolean) {
  let visibleSince: number | null = initiallyVisible ? start : null
  let visibleMs = 0

  return {
    setVisible(visible: boolean, now: number) {
      if (visible && visibleSince === null) visibleSince = now
      if (!visible && visibleSince !== null) {
        visibleMs += Math.max(0, now - visibleSince)
        visibleSince = null
      }
    },
    snapshot(now: number) {
      return {
        elapsedMs: Math.max(0, now - start),
        visibleMs: visibleMs + (visibleSince === null ? 0 : Math.max(0, now - visibleSince)),
      }
    },
  }
}
