# Service Brief

- Project: zxcvb
- Service name: TRIPLE NOISE
- Description: 실제 돈이나 결제 없이 3열 기호를 맞추고 빵빠레를 즐기는 타이포그래피 슬롯 미니게임
- Main features: 3열 슬롯 회전, 세 기호 일치 판정, 다음 PULL까지 지속되며 마우스·터치에 흩어지는 빵빠레 문자 효과, 로컬 플레이 기록, 결과 공유, 사운드 토글
- Login/membership: 없음
- Payment/email/file upload/admin: 모두 없음. 도박·결제·현금성 포인트 기능 없음

## Technical decisions

- Runtime: JoripSpace server
- Structured data: 없음. 플레이 횟수와 당첨 횟수는 사용자 브라우저에만 저장
- Visual system: 작은 FRAME·SCREEN·HANDLE·PULL·BASE 반복 단어로 네 모서리가 이어지는 폭 900px 슬롯 외곽을 만들고, 정확히 두 개의 SCREEN 세로선으로 3열을 구분한 포스트모던 UI. `@chenglou/pretext` 기반 저대비 고밀도 Canvas 텍스트 스트림
- Audio: 외부 음원 없이 Web Audio API로 회전음과 약 3.6초 길이의 상승 멜로디·피날레 화음 빵빠레 생성
- Sharing: Web Share 지원 환경에서는 시스템 공유창을 열고, 그 외 환경에서는 현재 결과·기록·사이트 주소를 클립보드에 복사
- Interaction: 전체 물리엔진 없이 90개 문자에 위치·속도·중력·마찰을 계산하고 포인터 이동 속도를 주변 문자에 힘으로 전달
- Preserved infrastructure: 기존 DB·스토리지 데이터는 삭제하지 않고 보존, Argo 테스트 경로 유지

Update this file one answer at a time during onboarding.
