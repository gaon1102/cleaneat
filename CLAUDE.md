# CleanEat — Claude Code 안내

작업 규칙·파일 구조·결정 사항은 AGENTS.md 한 곳에서 관리한다(Codex와 공통). 이 파일에는 내용을 중복해 적지 않는다.

@AGENTS.md

## Claude Code 빠른 참고

- 관련 파일만 연다: 문구·FAQ → `index.html` / 질문·메뉴·재료·기준값 → `js/data.js`(97KB, 필요한 부분만 검색해서 읽기) / 계산·결과 HTML → `js/engine.js` / 버튼·화면 전환 → `js/main.js` / 디자인 → `css/style.css`
- 계산을 건드렸으면 `node sim.js 3000`을 실행해 AGENTS.md 6번 지표와 같은지 확인한다(약 1분).
- 커밋·푸시·파일 삭제는 사용자가 직접 한다.
