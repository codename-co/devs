VERSION := $(shell node -p "require('./package.json').version")
IMAGE_NAME := codename/devs

# Docker build & push with version tags
docker-build:
	docker buildx build \
		--build-arg VERSION=$(VERSION) \
		--build-arg REVISION=$(shell git rev-parse HEAD) \
		--build-arg BUILDTIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ") \
		-t $(IMAGE_NAME):$(VERSION) \
		-t $(IMAGE_NAME):latest \
		.

docker-push:
	docker push $(IMAGE_NAME):$(VERSION)
	docker push $(IMAGE_NAME):latest

docker-deploy: docker-build docker-push

# Tag a new version and trigger CI
release:
	@echo "Releasing v$(VERSION)..."
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	git push origin v$(VERSION)

sync:
	@cd utils/devs-wss && rsync -av -e "ssh -i $$HOME/.ssh/id_rsa-arnley" --delete --exclude='*/node_modules' server.mjs Dockerfile compose.yaml package*.json root@49.13.17.51:/apps/devs/wss

sync-wss:
	@cd utils/devs-wss && rsync -av -e "ssh -i $$HOME/.ssh/id_rsa-arnley" --delete --exclude='*/node_modules' server.mjs Dockerfile compose.yaml package*.json root@49.13.17.51:/apps/devs/wss

# Run then:
# cd /apps/devs/bridge
# docker-compose up -d --build
sync-bridge:
	@cd utils/devs-bridge && rsync -av -e "ssh -i $$HOME/.ssh/id_rsa-arnley" --delete --exclude='*/node_modules' server.mjs Dockerfile compose.yaml package*.json root@49.13.17.51:/apps/devs/bridge

restart-bridge:
	@cd utils/devs-bridge && ssh -i "$$HOME/.ssh/id_rsa-arnley" root@49.13.17.51 "cd /apps/devs/bridge && docker-compose up -d --build"

sync-proxy:
	@cd utils/devs-proxy && rsync -av -e "ssh -i $$HOME/.ssh/id_rsa-arnley" --delete --exclude='*/node_modules' server.mjs Dockerfile compose.yaml package*.json root@49.13.17.51:/apps/devs/proxy

restart-proxy:
	@cd utils/devs-proxy && ssh -i "$$HOME/.ssh/id_rsa-arnley" root@49.13.17.51 "cd /apps/devs/proxy && docker-compose up -d --build"
