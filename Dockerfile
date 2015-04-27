FROM google/cloud-sdk

MAINTAINER Ryan Lester <hacker@linux.com>

LABEL Name="cyph"

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get install -y nodejs python python-pip ruby golang-go build-essential git gnupg

RUN go get github.com/gorilla/mux
RUN gem install sass specific_install
RUN gem specific_install -l https://github.com/buu700/fake_sqs
RUN npm -g install html-minifier clean-css uglifyjs typescript tsd bower browserstack browserify
RUN pip install beautifulsoup4 html5lib


VOLUME /cyph
VOLUME /home

WORKDIR /cyph/scripts
ENV HOME /home

EXPOSE 8080
EXPOSE 8081
EXPOSE 8082
EXPOSE 8083


CMD /bin/bash
