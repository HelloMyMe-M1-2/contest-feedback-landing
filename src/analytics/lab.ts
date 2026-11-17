/** 로컬 테스트 측정은 개발 서버에서 명시적으로 요청한 경우에만 사용합니다. */
export function shouldEnableLab(isDevelopment: boolean, hostname: string, search: string): boolean {
  return isDevelopment
    && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    && new URLSearchParams(search).get('analytics_lab') === '1'
}

/** 이벤트를 보는 별도 화면은 개발 서버의 로컬 주소에서만 제공합니다. */
export function shouldShowLabViewer(isDevelopment: boolean, hostname: string, pathname: string): boolean {
  return isDevelopment
    && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    && pathname === '/__analytics'
}
