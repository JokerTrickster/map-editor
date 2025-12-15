# 배포 가이드

이 문서는 map-editor 프로젝트의 배포 방법을 설명합니다.

## 목차
- [클라우드 배포 (S3)](#클라우드-배포-s3)
- [내부 서버 배포 (Docker)](#내부-서버-배포-docker)
- [환경 변수 설정](#환경-변수-설정)

---

## 클라우드 배포 (S3)

### GitHub Actions를 통한 자동 배포

1. **GitHub 저장소 → Actions 탭** 이동
2. **"Deploy to S3"** 워크플로우 선택
3. **"Run workflow"** 클릭
4. 배포할 브랜치 선택 (default: main)
5. 배포 시작

### 필요한 GitHub Secrets

`.github/workflows/deploy.yml` 실행을 위해 다음 시크릿이 필요합니다:

```
AWS_ACCESS_KEY_ID           # AWS Access Key
AWS_SECRET_ACCESS_KEY       # AWS Secret Key
VITE_GOOGLE_CLIENT_ID       # Google OAuth Client ID
CLOUDFRONT_DISTRIBUTION_ID  # (선택사항) CloudFront 배포 ID
```

### 수동 배포

```bash
# 1. 빌드
npm run build

# 2. AWS CLI로 S3 업로드
aws s3 sync dist/ s3://your-bucket-name --delete

# 3. (선택사항) CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

---

## 내부 서버 배포 (Docker)

### 방법 1: GitHub Actions를 통한 자동 배포 (권장)

1. **GitHub 저장소 → Actions 탭** 이동
2. **"Deploy to Docker"** 워크플로우 선택
3. **"Run workflow"** 클릭
4. **배포할 브랜치 선택** (main 또는 dev)
5. 자동으로 빌드 → 푸시 → 배포 실행

#### 필요한 GitHub Secrets

```
# Docker Registry
DOCKER_REGISTRY_URL         # Private registry URL (예: registry.company.com)
DOCKER_REGISTRY_USERNAME    # Registry 사용자명
DOCKER_REGISTRY_PASSWORD    # Registry 비밀번호

# Deploy Server (SSH)
DEPLOY_SERVER_HOST          # 배포 서버 IP 또는 도메인
DEPLOY_SERVER_USERNAME      # SSH 사용자명 (예: ubuntu, root)
DEPLOY_SERVER_SSH_KEY       # SSH Private Key
DEPLOY_SERVER_PORT          # (선택) SSH 포트 (기본값: 22)

# Build
VITE_GOOGLE_CLIENT_ID       # Google OAuth Client ID
```

#### 배포 프로세스

1. **빌드 서버 (맥미니 ARM64)**:
   - 코드 체크아웃
   - Docker 크로스 플랫폼 빌드 (linux/amd64)
   - Private Registry에 푸시
   - 타임스탬프 태그 자동 생성 (main-20240101-123456)

2. **배포 서버 (Linux AMD64, 자동 SSH 실행)**:
   - Registry에서 최신 이미지 pull
   - 기존 컨테이너 중지 및 삭제
   - 새 컨테이너 시작
   - Health check 확인
   - 구 이미지 정리

**참고**: 빌드 서버(ARM64)와 배포 서버(AMD64) 아키텍처가 다르므로 Docker Buildx를 사용한 크로스 플랫폼 빌드가 자동으로 수행됩니다.

### 방법 2: 로컬에서 직접 빌드

#### 2.1. 도커 이미지 빌드

**맥미니(ARM64)에서 Linux AMD64용 빌드:**

```bash
# Buildx 설정 (최초 1회)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

# 크로스 플랫폼 빌드
docker buildx build \
  --platform linux/amd64 \
  --tag map-editor:latest \
  --load \
  .

# 또는 Registry에 직접 푸시
docker buildx build \
  --platform linux/amd64 \
  --tag registry.company.com/map-editor:latest \
  --push \
  .
```

**일반 빌드 (같은 아키텍처):**

```bash
# 프로젝트 루트에서
docker build -t map-editor:latest .
```

#### 2.2. Registry에 푸시

```bash
# Registry 로그인
docker login registry.company.com

# 태그
docker tag map-editor:latest registry.company.com/map-editor:latest

# 푸시
docker push registry.company.com/map-editor:latest
```

### 방법 3: 내부 서버에서 직접 실행

#### 3.1. Docker 직접 실행

```bash
# 이미지 가져오기 (GitHub Actions로 빌드한 경우)
docker pull your-username/map-editor:latest

# 컨테이너 실행
docker run -d \
  --name map-editor \
  -p 80:80 \
  --restart unless-stopped \
  your-username/map-editor:latest

# 상태 확인
docker ps
curl http://localhost/health
```

#### 3.2. Docker Compose 사용 (권장)

```bash
# docker-compose.yml 파일이 있는 디렉토리에서

# 이미지 빌드 및 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down

# 재시작
docker-compose restart
```

### 배포 후 확인

```bash
# 헬스 체크
curl http://your-server-ip/health

# 컨테이너 로그
docker logs map-editor

# 컨테이너 상태
docker ps | grep map-editor
```

### 업데이트

```bash
# 새 이미지 가져오기
docker pull your-username/map-editor:latest

# 기존 컨테이너 중지 및 삭제
docker stop map-editor
docker rm map-editor

# 새 컨테이너 실행
docker run -d \
  --name map-editor \
  -p 80:80 \
  --restart unless-stopped \
  your-username/map-editor:latest
```

또는 Docker Compose 사용:

```bash
docker-compose pull
docker-compose up -d
```

---

## 환경 변수 설정

### 개발 환경

프로젝트 루트에 `.env.local` 파일 생성:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 프로덕션 환경

#### S3 배포 시
GitHub Secrets에 `VITE_GOOGLE_CLIENT_ID` 설정

#### Docker 배포 시
1. **빌드 타임**: GitHub Actions에서 build-args로 전달
2. **런타임**: 환경 변수가 빌드 시 포함되어 있음

---

## 포트 설정

- **개발 서버**: 5173 (Vite 기본값)
- **프로덕션 (Docker)**: 80 (nginx)

다른 포트 사용 시:

```bash
# Docker 실행 시 포트 변경
docker run -d -p 8080:80 --name map-editor map-editor:latest

# docker-compose.yml 수정
services:
  map-editor:
    ports:
      - "8080:80"  # 호스트:컨테이너
```

---

## 트러블슈팅

### Docker 빌드 실패

```bash
# 캐시 없이 재빌드
docker build --no-cache -t map-editor:latest .

# 빌드 로그 상세 확인
docker build --progress=plain -t map-editor:latest .
```

### 컨테이너 시작 실패

```bash
# 로그 확인
docker logs map-editor

# 컨테이너 내부 접근
docker exec -it map-editor sh

# nginx 설정 테스트
docker exec map-editor nginx -t
```

### 포트 충돌

```bash
# 포트 사용 확인
netstat -tuln | grep 80
lsof -i :80

# 다른 포트 사용
docker run -d -p 8080:80 map-editor:latest
```

---

## 보안 고려사항

1. **환경 변수**: 민감한 정보는 절대 코드에 하드코딩하지 마세요
2. **HTTPS**: 프로덕션에서는 HTTPS 사용 (nginx SSL 설정 또는 리버스 프록시)
3. **방화벽**: 필요한 포트만 개방
4. **정기 업데이트**: 베이스 이미지 및 의존성 정기 업데이트

---

## 추가 리소스

- [Docker 공식 문서](https://docs.docker.com/)
- [nginx 설정 가이드](https://nginx.org/en/docs/)
- [AWS S3 정적 웹 호스팅](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
