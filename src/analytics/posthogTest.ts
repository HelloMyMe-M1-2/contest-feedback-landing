import posthog from 'posthog-js'
import { canSendPosthogTest, filterPosthogTestEvent, testEventProperties } from './posthogTestPolicy'
import type { EventSink } from './tracker'

/** 개발자의 로컬 시험 전용. 실제 운영 데이터 수집에 사용하지 않습니다. */
export function initPosthogTest(): EventSink | undefined {
  const token = import.meta.env.VITE_POSTHOG_TEST_TOKEN ?? ''
  const host = import.meta.env.VITE_POSTHOG_TEST_HOST ?? ''
  if (!canSendPosthogTest(import.meta.env.DEV, window.location.hostname, window.location.search, token, host)) return undefined

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
    posthog.capture(event.event_name, testEventProperties(event), ending ? { transport: 'sendBeacon', send_instantly: true } : undefined)
  } }
}
