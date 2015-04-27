FROM ubuntu

MAINTAINER Ryan Lester <hacker@linux.com>

RUN apt-get update
RUN apt-get install node npm python python-pip rubygems

VOLUME /cyph
WORKDIR /cyph

EXPOSE 8080
EXPOSE 8081
EXPOSE 8082
EXPOSE 8083

scripts/env/deps.sh

CMD scripts/env/serve.sh
