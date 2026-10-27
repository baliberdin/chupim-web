.PHONY: install build typecheck test e2e run docker-build docker-up clean

install:
	npm ci

build:
	npm run build

typecheck:
	npm run typecheck

test: typecheck
	npm test

# End-to-end tests in a real browser (first run: npx playwright install chromium)
e2e: build
	npm run e2e

# Runs the server with the example stages and pipelines
run: build
	CHUPIM_EXAMPLES=1 npm start

docker-build:
	docker build --build-context chupim=../chupim -t chupim-web .

docker-up:
	docker compose up --build

clean:
	rm -rf dist public/build test-results playwright-report
