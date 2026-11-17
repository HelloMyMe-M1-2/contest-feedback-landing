import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** 화면에 절반 이상 연속 2초 보인 경우에만 노출로 셉니다. */
export function useExposure<T extends HTMLElement>(ref: RefObject<T | null>, key: string, onExposed: () => void) {
  const seen = useRef(new Set<string>())
  const callback = useRef(onExposed)
  callback.current = onExposed

  useEffect(() => {
    const element = ref.current
    if (!element || seen.current.has(key) || typeof IntersectionObserver === 'undefined') return
    let ratio = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancel = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
    }
    const schedule = () => {
      cancel()
      if (ratio < 0.5 || document.visibilityState !== 'visible' || seen.current.has(key)) return
      timer = setTimeout(() => {
        timer = undefined
        if (ratio >= 0.5 && document.visibilityState === 'visible' && !seen.current.has(key)) {
          seen.current.add(key)
          callback.current()
        }
      }, 2000)
    }
    const observer = new IntersectionObserver((entries) => {
      const entry = entries.find((item) => item.target === element)
      if (!entry) return
      ratio = entry.isIntersecting ? entry.intersectionRatio : 0
      schedule()
    }, { threshold: [0, 0.5] })
    observer.observe(element)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      cancel()
      observer.disconnect()
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [ref, key])
}
