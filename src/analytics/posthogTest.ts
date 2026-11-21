import posthog from 'posthog-js'
import { canSendPosthogPreview, canSendPosthogTest, filterPosthogTestEvent, testEventProperties } from './posthogTestPolicy'
import type { EventSink } from './tracker'

/** 개발자의 로컬·배포 화면 테스트 전용. 실제 실험 데이터에는 사용하지 않습니다. */
export function initPosthogTest(): EventSink | undefined {
  const token = import.meta.env.VITE_POSTHOG_TEST_TOKEN ?? ''
  const host = import.meta.env.VITE_POSTHOG_TEST_HOST ?? ''
  const local = canSendPosthogTest(import.meta.env.DEV, window.location.hostname, window.location.search, token, host)
  const preview = canSendPosthogPreview(import.meta.env.DEV, import.meta.env.VITE_POSTHOG_PREVIEW_ENABLED ?? '', window.location.hostname, window.location.search, token, host)
  if (!local && !preview) return undefined

  posthog.init(token, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    persistence: 'memory',
    person_profiles: 'never',
    save_campaign_params: false,
    save_referrer: false,
    before_send: filterPosthogTestEvent,
  })
  return { send: (event) => {
    const ending = event.event_name === 'visibility_checkpoint' && event.properties.trigger !== 'interval'
    posthog.capture(event.event_name, testEventProperties(event, local ? 'local' : 'preview'), ending ? { transport: 'sendBeacon', send_instantly: true } : undefined)
  } }
}
