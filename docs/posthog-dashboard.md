# PostHog로 실험 결과 보기

PostHog는 랜딩페이지에서 기록한 행동을 표와 그래프로 보여줍니다. 여러 그래프를 한 화면에 모은 것이 **대시보드**, 각각의 표나 그래프가 **인사이트**입니다. 이 문서는 만들 대시보드의 설계이며, 아직 프로젝트에 생성된 대시보드나 실제 실험 데이터는 아닙니다.

## 처음 준비할 대시보드

대시보드 이름은 `PLAN:CHECK 실험`으로 제안합니다. 실제 수집 전에는 별도 테스트 대시보드에서 `test_environment = local`로 필터하고, 운영용에는 테스트가 섞이지 않도록 운영 환경 구분값을 구현한 다음 필터합니다. 배포 테스트 이벤트는 `test_environment = preview`로 구분합니다. 실제 참가자 수집은 아직 구현되지 않아 운영 필터는 사용할 수 없습니다.

| 카드 | 확인할 내용 | 이벤트와 기준 |
| --- | --- | --- |
| 방문 | 하루별 페이지 방문 수 | `landing_viewed` 총 이벤트 수 |
| 게시글별 방문 | 어떤 게시글에서 유입됐는지 | `landing_viewed`를 `post_id`로 나누기. 채널은 `utm_source`, 실험·후킹 묶음은 `utm_campaign`으로 나눌 수 있음 |
| 샘플 사용 | 샘플 뷰어 노출 및 펼침·확대·목차 선택 | `sample_report_viewed`, `sample_interacted`를 `action` 또는 `section_id`로 나누기 |
| 사전 신청 | 이메일 입력 시작과 실제 저장 성공 | `registration_started`, `registration_completed` 각각의 수. 성공은 시트가 연결된 뒤만 확인 가능 |
| 스크롤·기기 | 어디까지 도달했고 어떤 기기였는지 | `scroll_depth_reached`의 `depth`, `landing_viewed`의 `device_category` |
| 체류시간·클릭 | 화면 표시 시간과 페이지 전체 클릭 | `visibility_checkpoint`를 페이지 방문 ID별로 묶고 누적값의 최댓값 사용. 단순 합계나 전체 이벤트 평균은 잘못된 수치 |

구매 버튼은 현재 원본에 없으므로 구매 카드도 만들지 않습니다. 실제 결제 및 게시글 조회 수는 이 대시보드에서 확인할 수 없습니다.

## 직접 만드는 순서

1. PostHog에서 프로젝트를 열고 **Product analytics → New insight**를 선택합니다. 첫 그래프는 **Trends**로 만듭니다.
2. 이벤트로 `landing_viewed`를 선택하고 집계 기준을 총 이벤트 수로 둡니다. 기간과 일별 구간을 선택합니다.
3. 게시글별로 보고 싶다면 **Breakdown**에 이벤트 속성 `post_id`를 선택합니다. 로컬 연습은 `test_environment = local` 필터를 적용합니다.
4. 인사이트 이름을 정해 저장하고 **Add to dashboard**로 대시보드에 추가합니다. 다른 카드도 같은 방식으로 만듭니다. 이벤트가 아직 도착하지 않았다면 목록에 바로 나타나지 않을 수 있으므로 로컬 테스트부터 확인합니다.
5. 신청 전환 흐름이 필요하면 **Funnel**에 방문·신청 시작·완료를 추가할 수 있습니다. PostHog의 기본 사용자 기준은 우리가 정한 페이지 방문 기준과 다르므로 화면의 집계 단위를 반드시 확인합니다. 정확한 페이지별 비율은 같은 `page_view_id`별로 묶은 쿼리를 준비·검증해야 합니다. 노출 2초 전에 신청한 방문도 있을 수 있으므로 샘플 노출을 필수 단계로 강제하지 않습니다.
6. 팀원이 PostHog에 초대된 뒤 대시보드를 확인합니다. 공개 링크를 켜면 링크를 가진 사람이 로그인 없이 볼 수 있으므로 팀 내부 공유에는 계정 접근을 우선합니다.

PostHog의 메뉴 이름과 무료 플랜 조건은 바뀔 수 있습니다. 공식 안내: [인사이트](https://posthog.com/docs/product-analytics/insights), [대시보드](https://posthog.com/docs/product-analytics/dashboards), [퍼널](https://posthog.com/docs/product-analytics/funnels).

## Google 시트에서 활용하기

PostHog의 인사이트·데이터 표는 내보내기 메뉴에서 CSV로 저장해 Google 시트에 가져와 분석할 수 있습니다. 예를 들어 게시글별 방문 집계표를 CSV로 저장한 뒤 Google 시트의 **파일 → 가져오기**를 이용합니다. 이 작업은 자동 동기화가 아니라 내보낸 시점의 복사본입니다. 메뉴와 파일 형식은 화면에 따라 다를 수 있습니다. [PostHog 데이터 내보내기 안내](https://posthog.com/docs/getting-started/data-import-export)

개별 이벤트 내보내기는 집계 결과 내보내기와 다릅니다. PostHog 공식 문서상 이벤트 표에서의 내보내기는 소규모용으로 최대 3,500개 이벤트 제한이 있습니다. 15초마다 발생하는 체류시간 기록도 각각 이벤트 한 건이므로 방문자 수보다 이벤트 수가 훨씬 많을 수 있습니다. 기간을 나누거나 다른 내보내기 방식을 검토해야 할 수 있습니다. [공식 제한 안내](https://posthog.com/docs/data-pipelines/troubleshooting)

신청자의 이메일은 PostHog에서 뽑지 않습니다. 연결 예정인 신청자 Google 시트에서 권한을 가진 팀원이 따로 확인합니다. 분석 결과 CSV는 필요한 항목만 내려받아 팀 권한이 있는 곳에 보관합니다.
