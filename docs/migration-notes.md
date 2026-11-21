# PLAN:CHECK 시안 이전 기록

팀이 제공한 ZIP의 HTML·CSS, 샘플 이미지와 글꼴을 기준으로 랜딩 화면을 연결했습니다. 전체가 처음부터 React 컴포넌트로 재작성된 것은 아니며, 현재 확인 가능한 화면은 [공개 테스트 주소](https://contest-feedback-landing.pages.dev/)입니다.

## 파일별 역할

- `src/plancheck/original.html`: 팀 시안을 바탕으로 한 화면 마크업.
- `src/plancheck/Prototype.tsx`: 원본 마크업을 React 요소로 연결하고 신청 폼과 측정 호출을 붙입니다.
- `src/plancheck/interactions.js`: 원본 상호작용을 분리해 연결한 임시 어댑터입니다. 섹션을 교체할 때 동작과 이벤트 연결을 다시 확인해야 합니다.
- `src/components/SignupForm.tsx`: 이메일 입력과 동의, 저장 성공·실패 화면을 처리합니다.
- `functions/api/signup.js`와 `scripts/apps-script/Code.gs`: 서버 검증 및 Google 시트 저장 경로입니다. D1 초안은 현재 신청 저장소가 아닙니다.

## 확인과 한계

- PC와 모바일 화면 크기의 로컬 브라우저에서 주요 화면과 샘플 확대를 확인한 이력이 있습니다. 모든 실제 휴대기기와 화면 크기를 검증한 것은 아닙니다.
- 로컬 Node 서버를 통한 가상 이메일의 Google 시트 저장과 완료 화면을 확인했습니다. **배포된 Cloudflare 사이트와 시트의 연결은 아직 미검증**입니다.
- 원본과 현재 화면에 구매 버튼은 없습니다. 실제 자동 분석이나 결제는 제공하지 않습니다.
- 원본 ZIP의 PC·모바일 프레임 전환 도구는 옮기지 않았습니다. 화면 자체는 기기 너비에 따라 반응합니다.

원본 문구는 팀 시안으로 유지 중이며 실제 서비스의 제공 상태와 일치하는지는 실험 시작 전에 확인해야 합니다.
