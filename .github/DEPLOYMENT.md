# S3 웹 호스팅 배포 가이드

## GitHub Secrets 설정

GitHub Actions에서 S3 배포를 위해 다음 Secrets를 설정해야 합니다:

### 필수 Secrets

1. **AWS_ACCESS_KEY_ID**
   - AWS IAM 사용자의 Access Key ID
   - S3 및 CloudFront (선택) 권한 필요

2. **AWS_SECRET_ACCESS_KEY**
   - AWS IAM 사용자의 Secret Access Key

3. **VITE_GOOGLE_CLIENT_ID**
   - Google OAuth Client ID
   - 프로덕션 환경용 Client ID

### 선택 Secrets

4. **CLOUDFRONT_DISTRIBUTION_ID** (선택)
   - CloudFront를 사용하는 경우 Distribution ID
   - 설정하지 않으면 CloudFront 무효화 단계를 건너뜀

## Secrets 설정 방법

1. GitHub 저장소로 이동
2. Settings → Secrets and variables → Actions
3. "New repository secret" 클릭
4. 각 Secret의 이름과 값을 입력

## IAM 권한 설정

배포용 IAM 사용자에 다음 권한 필요:

### S3 권한 (필수)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::jokertrickster-map-editor-dev",
        "arn:aws:s3:::jokertrickster-map-editor-dev/*"
      ]
    }
  ]
}
```

### CloudFront 권한 (선택)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

## 배포 방법

### 수동 배포 (권장)

1. GitHub 저장소의 **Actions** 탭으로 이동
2. 왼쪽 사이드바에서 **"Deploy to S3"** 워크플로우 선택
3. 오른쪽 상단의 **"Run workflow"** 버튼 클릭
4. **Branch to deploy** 드롭다운에서 배포할 브랜치 선택:
   - `main`: 프로덕션 배포
   - `develop`: 개발 환경 배포
5. **"Run workflow"** 버튼으로 배포 시작

### 배포 진행 상황 확인

- Actions 탭에서 실시간 배포 로그 확인 가능
- 각 단계별 성공/실패 상태 표시
- 배포 완료 시 URL 출력

## 배포 URL

- **개발 환경**: http://jokertrickster-map-editor-dev.s3-website.ap-south-1.amazonaws.com

## 배포 프로세스

1. 코드 체크아웃
2. Node.js 18 설정
3. 의존성 설치 (npm ci)
4. 프로덕션 빌드 (npm run build)
5. AWS 자격 증명 구성
6. S3에 dist/ 폴더 동기화
   - 기존 파일 삭제 (--delete)
   - 정적 자산 캐싱 (max-age=31536000)
   - index.html 캐싱 방지 (no-cache)
7. CloudFront 무효화 (설정된 경우)

## 캐싱 전략

- **정적 자산** (JS, CSS, 이미지): 1년 캐싱
- **index.html**: 캐싱 안 함 (항상 최신 버전)

## 트러블슈팅

### 배포 실패 시 체크리스트

1. ✅ GitHub Secrets가 올바르게 설정되었는가?
2. ✅ IAM 사용자가 S3 버킷에 접근 권한이 있는가?
3. ✅ S3 버킷 이름이 정확한가?
4. ✅ AWS 리전이 ap-south-1로 설정되었는가?
5. ✅ npm run build가 로컬에서 성공하는가?

### 일반적인 오류

**403 Forbidden**
- IAM 권한 부족
- 버킷 정책 확인 필요

**빌드 실패**
- VITE_GOOGLE_CLIENT_ID 확인
- 의존성 문제 확인 (package-lock.json)

**파일이 업데이트되지 않음**
- 브라우저 캐시 삭제
- CloudFront 무효화 필요 (사용 중인 경우)
