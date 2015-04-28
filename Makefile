all:
	docker build -t cyph/$$(git branch | awk '/^\*/{print $$2}') .

clean:
	./docker.sh kill
	docker images | grep cyph | awk '{print $$3}' | xargs -I% docker rmi -f %
	docker images --filter dangling=true --quiet | xargs -I% docker rmi -f %
