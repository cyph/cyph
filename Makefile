all:
	docker build -t cyph/$$(git branch | awk '/^\*/{print $2}') .

clean:
	docker ps -a | grep cyph | awk '{print $1}'| while read con ; do docker kill $con -s 9 ; docker rm $con ; done
	docker images | grep cyph | awk '{print $3}' | xargs -I% docker rmi -f %
	docker rmi $(docker images --filter dangling=true --quiet)
