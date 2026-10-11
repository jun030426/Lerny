# Lerny

알고보자 팀의 대학교 캡스톤 디자인 프로젝트. 실제 교수의 강의 자료를 기반으로 질의응답·이론과 실습 퀴즈·교수 학습 분석·실사형 AI 강사의 개념 강의와 음성 대화를 목표로 한다. 목표 기능과 현재 구현 범위는 구분한다.

최신 기능 정책은 [확정 기획 v0.4](docs/11_확정_기획_2026-10-12.md)다. [변경 대조표](docs/12_기획_변경_대조표.md)와 [남은 개발 작업](docs/13_남은_개발_작업.md)을 함께 읽는다. 기술 설계 문서는 [개발 착수 기준](docs/00_개발_착수_기준.md)에서 시작하며, [기존 기능 명세 v0.3](Lerny%20기능%20명세%20초안.md)은 변경 전 이력으로 보존한다.

초기에는 개발 PC와 무료 도구·직접 실행 모델을 사용한다. 외부 LLM API는 사용하지 않는다. C·Java·Python의 최종 실습 제출은 서버에서 검증한다. 사용자 후속 요청에 따라 TraceLens-test의 화면 흐름·버튼 동작을 참고하여 재구성했다. 디자인과 목업 데이터는 복제하지 않는다. [화면 흐름 반영](docs/10_화면_흐름_참고_반영.md).

현재는 Windows 네이티브 PostgreSQL·로컬 Ollama와 연결하여 계정, 과목·분반, 자료 처리, 근거 답변, 이론 문항 생성, 제출·서술형 채점, 복습, 교수 분석의 첫 학습 흐름을 구현했다. 합성 자료로 실제 모델을 사용한 통합 실행을 확인했다. **전체 명세 완료나 학생 시범 운영 준비 완료는 아니다.** 구현 범위·미완료 항목·증거는 [구현 현황](docs/09_로컬_구현_현황.md), 완료 관문은 [검증과 개발 관문](docs/07_검증과_개발_관문.md)을 따른다.

활성 작업 위치는 `D:\캡스톤디자인_Lerny`이며 도구·캐시·모델·실행 데이터는 `D:\LernyData`에 분리한다. PowerShell에서 `. .\scripts\Enter-Dev.ps1`로 개발 환경변수를 적용한다. 설치 결과와 남은 환경 관문은 [개발환경 점검](docs/08_개발환경_점검.md)을 참고한다. GitHub 원격 변경·푸시는 사용자가 해당 작업을 명시적으로 허용한 경우에만 수행한다.

## 로컬 실행

설치된 현재 PC에서는 프로젝트 루트 PowerShell에서 다음을 실행한다. 서비스는 127.0.0.1에만 바인딩한다. 기존 포트의 프로세스는 종료하거나 교체하지 않는다. 숨겨진 별도 프로세스의 출력은 `D:\LernyData\logs`에 기록한다.

```powershell
.\scripts\Start-Local.ps1
```

개별 서비스 개발 시에는 터미널마다 아래 스크립트를 실행하며 Ctrl+C로 종료한다. DB는 Start-Local이 시작하고, 이미 실행 중이면 유지한다.

```powershell
.\scripts\Start-Api.ps1
```

```powershell
.\scripts\Start-Web.ps1
```

```powershell
.\scripts\Start-Model.ps1
```

```powershell
.\scripts\Start-Worker.ps1
```

화면은 http://127.0.0.1:5173, API는 http://127.0.0.1:8000 이다. `/api/v1/health/live`는 프로세스 응답, `/api/v1/health/ready`는 DB·모델 상태와 아직 비활성인 sandbox를 표시한다. 전체 준비 상태는503을 유지한다. 학생 코드 실행 엔드포인트는 등록하지 않는다.

운영 계정 최초 비밀번호는 코드 밖 `D:\LernyData\secrets\initial-operator.json`에 있다. 첫 로그인 후 비밀번호 변경이 필요하다. 체험 교수/학생의 기존 자격 정보는 같은 디렉터리의 `demo-accounts.json`에 있다. 비밀번호를 Git이나 화면 캡처·공유 문서에 넣지 않는다. 체험 데이터에는 실제 학생·교수 정보를 사용하지 않았다.

## 의존성 복원과 확인

기존 uv 도구와 Python이 설치된 환경에서 다음을 실행한다. 잠금 파일은 uv.lock과 apps/web/package-lock.json이다.

```powershell
. .\scripts\Enter-Dev.ps1
uv sync --locked
npm.cmd --prefix apps/web ci
uv run --locked pytest -q
uv run --locked ruff check apps/api
npm.cmd --prefix apps/web run build
```

2026-10-09 확인: API·권한·자료·학습 테스트18개, Ruff, Alembic 모델/마이그레이션 일치, TypeScript/Vite 빌드 통과. 실제 로컬 모델 통합 실행과 교수 분석 화면을 확인했다. 합성 자료 검증은 실제 수업 품질·100명 수용량·코드 실행 격리 인수를 대체하지 않는다.
