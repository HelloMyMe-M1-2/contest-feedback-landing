export type DeviceCategory = 'mobile' | 'desktop' | 'other' | 'unknown'
export type Depth = 25 | 50 | 75 | 100

/** 원본 UA는 저장하거나 전송하지 않습니다. 분류가 확실하지 않으면 unknown입니다. */
export function classifyDevice(userAgent: string, mobileHint?: boolean): DeviceCategory {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) return 'other'
  if (mobileHint === true || /iPhone|iPod|Android.*Mobile/i.test(userAgent)) return 'mobile'
  if (/Windows NT|Macintosh|X11|Linux x86_64/i.test(userAgent)) return 'desktop'
  return 'unknown'
}

/** 끝점 대비 화면 아래쪽의 위치로 구간을 판정합니다. 이미 지난 구간은 다시 세지 않습니다. */
export function newlyReachedDepths(scrollY: number, viewportHeight: number, pageEnd: number, reached: Set<Depth>): Depth[] {
  if (viewportHeight <= 0 || pageEnd <= 0) return []
  const percent = Math.min(100, Math.max(0, (scrollY + viewportHeight) / pageEnd * 100))
  const result: Depth[] = []
  for (const depth of [25, 50, 75, 100] as const) {
    if (percent >= depth && !reached.has(depth)) {
      reached.add(depth)
      result.push(depth)
    }
  }
  return result
}
