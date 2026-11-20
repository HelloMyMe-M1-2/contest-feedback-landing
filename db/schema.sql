-- 최초 1회 적용. 이메일에는 접근 권한과 삭제 절차가 필요합니다.
CREATE TABLE IF NOT EXISTS signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT '',
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);
