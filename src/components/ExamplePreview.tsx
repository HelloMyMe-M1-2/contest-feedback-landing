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
    <section aria-labelledby="examples-title">
      <h2 id="examples-title">가상 피드백 예시</h2>
      <p>아래 내용은 서비스 구상을 설명하기 위한 가상 예시입니다. 실제 분석이나 심사 의견이 아닙니다.</p>
      <div className="choices" aria-label="예시 선택">
        {(Object.keys(examples) as ExampleId[]).map((id) => (
          <button key={id} type="button" aria-pressed={selected === id} onClick={() => { setSelected(id); onSelect(id) }}>
            {examples[id].label}
          </button>
        ))}
      </div>
      <article ref={exampleRef} aria-live="polite">
        <h3>{example.label}</h3>
        <p><strong>기획안 문장:</strong> {example.quote}</p>
        <p><strong>확인할 부분:</strong> {example.feedback}</p>
        <p><strong>왜 확인할까요?</strong> {example.reason}</p>
        <p><strong>점검 기준:</strong> {example.basis}</p>
      </article>
    </section>
  )
}
