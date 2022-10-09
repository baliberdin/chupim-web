VERSION=0.1.3

build:
	docker build . -t chupim-web:${VERSION}

run-local: build
	docker run --rm --name chupim-web -p 3000:3000 chupim-web:${VERSION}

run-local-with-samples: build
	docker run --rm --name chupim-web -p 3000:3000 -e CHUPIM_EXAMPLES=1 chupim-web:${VERSION}