import { useRef, useState } from 'react'
import { useExposure } from '../analytics/useExposure'
import type { ExampleId } from '../analytics/contracts'

const examples: Record<ExampleId, { label: string; quote: string; feedback: string; reason: string; basis: string }> = {
  problem: {
    label: '문제 정의',
    quote: '청년들이 관심사를 나누고 모일 공간이 부족하다.',
    feedback: '어떤 청년이 기존 공간에서 어떤 불편을 겪는지 근거를 확인하기 어렵습니다.',
    reason: '공간을 찾는 문제와 모임에 참여하는 문제는 서로 다른 해결책이 필요할 수 있습니다.',
    basis: '대상과 문제에 맞는 근거가 제시되었는가?',
  },
  operation: {
    label: '실행 계획',
    quote: '청년 모임과 강연을 운영한다.',
    feedback: '운영 주체, 역할, 운영 횟수가 구체적으로 제시되지 않았습니다.',
    reason: '누가 언제 운영하는지 알아야 실행 가능성을 검토할 수 있습니다.',
    basis: '운영 주체와 일정이 구체적인가?',
  },
  effect: {
    label: '기대 효과',
    quote: '청년의 교류를 늘리고 지역 공간에 활력을 더한다.',
    feedback: '기대하는 변화를 어떤 자료로 확인할지 제시되지 않았습니다.',
    reason: '확인 방법이 있어야 목표에 가까워졌는지 살펴볼 수 있습니다.',
    basis: '기대 효과를 확인할 방법이 제시되었는가?',
  },
}

type Props = { onSelect: (id: ExampleId) => void; onExposed: (id: ExampleId) => void }

export function ExamplePreview({ onSelect, onExposed }: Props) {
  const [selected, setSelected] = useState<ExampleId>('problem')
  const example = examples[selected]
  const exampleRef = useRef<HTMLElement>(null)
  useExposure(exampleRef, selected, () => onExposed(selected))
  return (
    <section className="example-section section-wrap" id="example" aria-labelledby="examples-title">
      <div className="example-heading">
        <div><h2 id="examples-title">어디를, 왜 살펴봐야 하는지<br />함께 확인해요.</h2></div>
        <p>막연한 평가 대신 기획안에서 확인할 부분과 그 이유, 점검 기준을 함께 보여주는 리포트를 구상하고 있어요.</p>
      </div>
      <div className="report-shell">
        <div className="report-top"><div><span>피드백 미리보기</span></div><span className="sample-badge">가상 예시</span></div>
        <div className="choices" aria-label="예시 선택">
          {(Object.keys(examples) as ExampleId[]).map((id) => (
            <button key={id} type="button" aria-pressed={selected === id} onClick={() => { setSelected(id); onSelect(id) }}>
              {examples[id].label}
            </button>
          ))}
        </div>
        <article className="report-content" ref={exampleRef} aria-live="polite">
          <div className="report-intro"><h3>{example.label}</h3></div>
          <div className="report-quote"><span>기획안 문장</span><p>“{example.quote}”</p></div>
          <div className="report-row"><div><h4>확인할 부분</h4><p>{example.feedback}</p></div></div>
          <div className="report-row"><div><h4>왜 확인할까요?</h4><p>{example.reason}</p></div></div>
          <div className="report-basis"><span>참고한 점검 기준</span><p>{example.basis}</p></div>
        </article>
        <p className="sample-disclaimer">위 내용은 이해를 돕기 위한 가상 예시이며, 실제 분석이나 심사 의견이 아닙니다.</p>
      </div>
    </section>
  )
}
