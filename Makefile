all:
	docker build -t cyph/$$(git branch | awk '/^\*/{print $$2}') .

clean:
	docker ps -a | grep cyph | awk '{print $$1}' | xargs -I% bash -c "docker kill -s 9 % ; docker rm %"
	docker images | grep cyph | awk '{print $$3}' | xargs -I% docker rmi -f %
	docker images --filter dangling=true --quiet | xargs -I% docker rmi -f %
