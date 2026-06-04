#!/bin/bash
# =============================================================================
# BUILD AND PUSH DOCKER IMAGE
# =============================================================================
# Tag scheme: ENV-YYYY.MM.PATCH-HASH (matches quantumbytes-deck-app)
#   ENV    = prod (main/master/production) | stag | dev
#   PATCH  = auto-increment per month based on existing git tags
#   HASH   = short commit hash
#
# Usage:
#   ./build-push-docker.sh                  # build + push with computed tag
#   ./build-push-docker.sh --no-push        # build only
#   ./build-push-docker.sh --no-tag         # skip git tag creation/push
#   ./build-push-docker.sh --print-tag      # just print computed tag and exit
# =============================================================================

set -e

# Resolve script dir + repo root (script lives in .deployments/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

DOCKERFILE="${DOCKERFILE:-.deployments/Dockerfile}"
DO_PUSH=true
DO_TAG=true
PRINT_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-push)    DO_PUSH=false; shift ;;
        --no-tag)     DO_TAG=false; shift ;;
        --print-tag)  PRINT_ONLY=true; shift ;;
        --help|-h)
            sed -n '2,16p' "$0"
            exit 0
            ;;
        *)
            echo "Unknown arg: $1"; exit 1 ;;
    esac
done

GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

if [[ "$GIT_BRANCH" == "master" ]] || [[ "$GIT_BRANCH" == "main" ]] || [[ "$GIT_BRANCH" == "production" ]]; then
    ENV="prod"
elif [[ "$GIT_BRANCH" == "stag" ]]; then
    ENV="stag"
else
    ENV="dev"
fi

YEAR_MONTH=$(date +"%Y.%m")

git fetch --tags --force 2>/dev/null || true

LATEST_PATCH=$(git tag -l "${ENV}-${YEAR_MONTH}.*" 2>/dev/null | \
    sed "s/${ENV}-${YEAR_MONTH}\.\([0-9]*\)-.*/\1/" | \
    sort -n | \
    tail -1)

if [ -z "$LATEST_PATCH" ]; then
    PATCH=1
else
    PATCH=$((LATEST_PATCH + 1))
fi

VERSION_TAG="${ENV}-${YEAR_MONTH}.${PATCH}-${GIT_COMMIT_HASH}"
FULL_IMAGE="${IMAGE_NAME}:${VERSION_TAG}"

if [ "$PRINT_ONLY" = true ]; then
    echo "$VERSION_TAG"
    exit 0
fi

if [ -z "$IMAGE_NAME" ]; then
    echo "❌ IMAGE_NAME is required. Example: IMAGE_NAME=org/repo $0" >&2
    exit 1
fi

if [ "$DO_PUSH" = true ]; then
    CFG="${DOCKER_CONFIG:-$HOME/.docker}/config.json"
    if [ ! -f "$CFG" ] || ! grep -qE '"auths"[[:space:]]*:[[:space:]]*\{[^}]*"' "$CFG" 2>/dev/null && ! grep -q '"credsStore"' "$CFG" 2>/dev/null && ! grep -q '"credHelpers"' "$CFG" 2>/dev/null; then
        echo "⚠️  Warning: Docker login not detected in $CFG. Run 'docker login' first."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    fi
fi

echo "=========================================="
echo "  Docker Build & Push"
echo "=========================================="
echo "Branch:       $GIT_BRANCH"
echo "Environment:  $ENV"
echo "Commit:       $GIT_COMMIT_HASH"
echo "Image:        $FULL_IMAGE"
echo "Dockerfile:   $DOCKERFILE"
echo "Context:      $REPO_ROOT"
echo "=========================================="
echo ""

echo "🔨 Building $FULL_IMAGE..."
docker build -f "$DOCKERFILE" -t "$FULL_IMAGE" -t "${IMAGE_NAME}:latest" .
echo "✅ Build complete"
echo ""

if [ "$DO_PUSH" = true ]; then
    echo "🔄 Pushing $FULL_IMAGE..."
    docker push "$FULL_IMAGE"
    docker push "${IMAGE_NAME}:latest"
    echo "✅ Push complete"
    echo ""

    if [ "$DO_TAG" = true ]; then
        echo "🏷️  Creating git tag: $VERSION_TAG"
        git tag "$VERSION_TAG" 2>/dev/null || echo "⚠️  Tag already exists locally"
        git push origin "$VERSION_TAG" 2>/dev/null || echo "⚠️  Tag push failed or already exists"
    fi
fi

cat > "$SCRIPT_DIR/.docker-version" << EOF
VERSION_TAG=$VERSION_TAG
IMAGE=$FULL_IMAGE
ENV=$ENV
GIT_BRANCH=$GIT_BRANCH
GIT_COMMIT_HASH=$GIT_COMMIT_HASH
BUILD_DATE=$(date -Iseconds)
EOF

echo ""
echo "=========================================="
echo "  DONE: $FULL_IMAGE"
echo "=========================================="
