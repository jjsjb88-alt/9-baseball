# 생성 원본 넣는 곳

제미나이 / 안티그래비티 이미지 생성으로 받은 **PNG 원본**을 `A1-아무이름.png` 처럼 에셋 ID로 시작하는 이름으로 넣는다.
`node scripts/asset-fix.mjs A1` 이 가장 최근 이름의 파일을 골라 정리본을 `assets/ui-kit/`에 만든다.
JPG·WEBP는 안 된다 (PNG로 저장).
