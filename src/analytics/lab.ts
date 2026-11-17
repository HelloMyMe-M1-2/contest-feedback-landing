/** 실습장은 개발 서버의 로컬 주소에서 명시적으로 요청한 경우에만 사용합니다. */
export function shouldEnableLab(isDevelopment: boolean, hostname: string, search: string): boolean {
  return isDevelopment
    && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    && new URLSearchParams(search).get('analytics_lab') === '1'
}
