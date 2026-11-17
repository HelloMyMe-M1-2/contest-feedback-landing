import type { Campaign } from './contracts'

/** 자유 입력값과 URL 전체를 보관하지 않도록 짧은 식별자만 허용합니다. */
function safeId(value: string | null): string {
  if (!value || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) return 'unknown'
  return value.toLowerCase()
}

export function readCampaign(search: string): Campaign {
  const params = new URLSearchParams(search)
  return {
    post_id: safeId(params.get('utm_content')),
    utm_source: safeId(params.get('utm_source')),
    utm_medium: safeId(params.get('utm_medium')),
    utm_campaign: safeId(params.get('utm_campaign')),
  }
}
