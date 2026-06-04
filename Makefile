DEPLOY_DIR := .deployments
COMPOSE    := docker compose -f $(DEPLOY_DIR)/docker-compose.yml

ifndef IMAGE_NAME
  $(error IMAGE_NAME is required. Example: make build_and_push IMAGE_NAME=org/repo)
endif

CONTAINER_NAME ?= $(notdir $(IMAGE_NAME))

# Auto-compute version tag: ENV-YYYY.MM.PATCH-HASH
IMAGE_TAG ?= $(shell IMAGE_NAME=$(IMAGE_NAME) $(DEPLOY_DIR)/build-push-docker.sh --print-tag 2>/dev/null)
IMAGE     := $(IMAGE_NAME):$(IMAGE_TAG)

export IMAGE_NAME := $(IMAGE)
export CONTAINER_NAME

.PHONY: build push build_and_push print-tag up down logs

print-tag:
	@IMAGE_NAME=$(IMAGE_NAME) $(DEPLOY_DIR)/build-push-docker.sh --print-tag

build:
	IMAGE_NAME=$(IMAGE_NAME) $(DEPLOY_DIR)/build-push-docker.sh --no-push --no-tag

build_and_push:
	IMAGE_NAME=$(IMAGE_NAME) $(DEPLOY_DIR)/build-push-docker.sh

push:
	docker push $(IMAGE)

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f
