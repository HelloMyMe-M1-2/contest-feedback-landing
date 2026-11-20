import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import original from './original.html?raw'
import './original.css'
import './prototype.css'
import { SignupForm } from '../components/SignupForm'
import { initPrototype } from './interactions'
import { readCampaign } from '../analytics/campaign'
import { createTracker, disabledSink } from '../analytics/tracker'
import { shouldEnableLab } from '../analytics/lab'
import { openLabChannel } from '../analytics/labChannel'
import { classifyDevice } from '../analytics/pageMetrics'
import { usePageMetrics } from '../analytics/usePageMetrics'
import { useExposure } from '../analytics/useExposure'
import type { EventProperties } from '../analytics/contracts'
import type { EventSink } from '../analytics/tracker'

// Parse the supplied local template to React elements. Its interactive legacy code is isolated
// in interactions.js until it can be replaced section by section; it is not executed as HTML.
const map: Record<string, string> = { class:'className', for:'htmlFor', tabindex:'tabIndex', readonly:'readOnly', colspan:'colSpan', rowspan:'rowSpan', viewbox:'viewBox', 'stroke-width':'strokeWidth', 'stroke-linecap':'strokeLinecap', 'stroke-linejoin':'strokeLinejoin', 'fill-rule':'fillRule', 'clip-rule':'clipRule', 'aria-controls':'aria-controls', 'xlink:href':'xlinkHref', 'autocomplete':'autoComplete', 'inputmode':'inputMode', 'maxlength':'maxLength', 'novalidate':'noValidate' }
function cssObject(style: string): Record<string, string> {
  return Object.fromEntries(style.split(';').filter(Boolean).map(rule => { const i=rule.indexOf(':'); const key=rule.slice(0,i).trim(); return [key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), rule.slice(i+1).trim()] }).filter(([k])=>k))
}
function convert(node: ChildNode, key: number): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (!(node instanceof Element)) return null
  const props: Record<string, unknown> = { key }
  for (const a of Array.from(node.attributes)) {
    const name = map[a.name] || a.name
    if (name === 'style') props.style = cssObject(a.value)
    else if (['hidden','disabled','noValidate','required','checked'].includes(name)) props[name] = true
    else props[name] = a.value
  }
  return createElement(node.tagName.toLowerCase(), props, ...Array.from(node.childNodes).map(convert))
}
const parsed = new DOMParser().parseFromString(original, 'text/html')
const originalElements = Array.from(parsed.body.childNodes).map(convert)

export default function Prototype({ testSink }: { testSink?: EventSink }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const channel = useRef<BroadcastChannel | null>(null)
  const pageViewed = useRef(false)
  const sampleRef = useRef<HTMLElement | null>(null)
  const enabled = shouldEnableLab(import.meta.env.DEV, location.hostname, location.search)
  const campaign = useMemo(() => readCampaign(location.search), [])
  const context = useMemo(() => ({ pageViewId: enabled ? crypto.randomUUID() : 'disabled', deviceCategory: enabled ? classifyDevice(navigator.userAgent) : 'unknown' as const }), [enabled])
  const sink = useMemo<EventSink>(() => enabled ? { send(event) { try { channel.current?.postMessage({ type: 'event', event, posthogTestEnabled: Boolean(testSink) }) } catch { /* isolated */ } testSink?.send(event) } } : disabledSink, [enabled,testSink])
  const tracker = useMemo(() => createTracker(campaign, sink, context), [campaign,sink,context])
  useEffect(() => { sampleRef.current = document.querySelector('#viewer .vw-bar') }, [])
  useExposure(sampleRef, 'sample-report-v1', () => tracker.track('sample_report_viewed', { sample_version: '1' }))
  usePageMetrics(enabled, tracker.track)
  useEffect(() => { if (!enabled) return; channel.current = openLabChannel(); return () => { channel.current?.close(); channel.current = null } }, [enabled])
  useEffect(() => { if (!pageViewed.current) { pageViewed.current=true; tracker.track('landing_viewed', {}) } }, [tracker])
  useEffect(() => {
    setTarget(document.getElementById('react-signup'))
    const stop = initPrototype((event, params) => {
      if (event === 'sample_expand' || event === 'sample_zoom_open' || event === 'sample_section_click') {
        const ids: EventProperties['sample_interacted']['section_id'][] = ['overview', 'criteria', 'strengths', 'basic', 'weaknesses', 'questions', 'deep']
        const sectionId = ids.find((id) => id === params.section_id) ?? 'none'
        tracker.track('sample_interacted', { action: event === 'sample_expand' ? 'expand' : event === 'sample_zoom_open' ? 'zoom' : 'section', section_id: sectionId })
      }
      if (event === 'cta_click') {
        const locations: EventProperties['cta_clicked']['location'][] = ['header', 'drawer', 'hero', 'how', 'toc', 'after-sample', 'mbar']
        const location = locations.find((item) => item === params.location)
        const target = params.target === '#sample' ? 'sample' : params.target === '#signup' ? 'signup' : null
        if (location && target) tracker.track('cta_clicked', { location, target })
      }
    })
    return () => { stop() }
  }, [tracker])
  return <>{originalElements}{target && createPortal(<SignupForm onStart={() => tracker.track('registration_started', {form_version:'1'})} onComplete={() => tracker.track('registration_completed', {form_version:'1',result:'new'})} />, target)}</>
}
