import { useRef, useState } from 'react'

type Props = { onStart: () => void; onComplete: () => void }
export function SignupForm({ onStart, onComplete }: Props) {
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState('')
  const [consent, setConsent] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const started = useRef(false)
  const sending = useRef(false)
  const start = () => { if (!started.current) { started.current = true; onStart() } }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current || !email.trim() || !consent) return
    sending.current = true; setStatus('sending')
    try {
      const response = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), stage, consent }) })
      const result: unknown = await response.json()
      if (!response.ok || !result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) throw new Error('save failed')
      setStatus('success'); setEmail(''); onComplete()
    } catch { setStatus('error') } finally { sending.current = false }
  }
  return <form className={'form' + (status === 'success' ? ' ok' : '')} onSubmit={submit}>
    <div className="fields"><h3>사전 신청</h3><p className="sub">이메일 하나면 충분해요. 30초면 끝나요.</p>
      <label className="lbl" htmlFor="signup-email">이메일</label><input className="inp" id="signup-email" type="email" maxLength={254} autoComplete="email" placeholder="name@example.com" value={email} onFocus={start} onChange={e => setEmail(e.target.value)} required />
      <fieldset className="q"><legend>지금 준비 중인 공모전이 있나요?<span>선택</span></legend><div className="opts">{[['within_1m', '마감 한 달 이내'], ['over_1m', '한 달 이상 남았어요'], ['exploring', '아직 찾는 중']].map(([value, label]) => <label className="opt" key={value}><input type="radio" name="stage" value={value} checked={stage === value} onChange={() => setStage(value)} /><span>{label}</span></label>)}</div></fieldset>
      <label className="agree"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required /><span>[필수] 개인정보 수집·이용에 동의해요</span><button type="button" className="agree-more" onClick={e => { e.preventDefault(); setShowDetail(!showDetail) }} aria-expanded={showDetail}> {showDetail ? '접기' : '내용 보기'}</button></label>
      {showDetail && <dl className="agree-detail"><div><dt>수집 항목 </dt><dd>이메일 주소, 준비 중인 공모전 여부(선택)</dd></div><div><dt>이용 목적 </dt><dd>서비스 출시 및 사전 신청자 안내</dd></div><div><dt>보유 기간 </dt><dd>출시 안내 발송 후 지체 없이 파기</dd></div><div>동의를 거부할 수 있으나, 거부 시 사전 신청이 어려워요.</div></dl>}
      <button className="btn btn-accent submit" type="submit" disabled={status === 'sending'}>{status === 'sending' ? '신청하는 중…' : '사전 신청하기'}</button><p className="fine">광고성 메일은 보내지 않아요.</p>
      {status === 'error' && <p className="err" role="alert">신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
    </div><div className="done" aria-live="polite"><div className="ck">✓</div><h3>사전 신청이 완료됐어요</h3><p>신청해 주셔서 감사합니다.</p></div>
  </form>
}
