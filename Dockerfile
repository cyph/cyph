FROM google/cloud-sdk

MAINTAINER Ryan Lester <hacker@linux.com>

LABEL Name="cyph"

RUN apt-get update
RUN apt-get dist-upgrade -y

RUN apt-get install -y curl python python-pip perl golang-go build-essential git gnupg procps

RUN curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get install -y nodejs

RUN gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3
RUN curl -sSL https://get.rvm.io | bash -s stable --ruby


RUN bash -c ' \
	source /etc/profile.d/rvm.sh; \
	gem install sass specific_install; \
	gem specific_install -l https://github.com/buu700/fake_sqs; \
'

RUN go get github.com/gorilla/mux
RUN npm -g install html-minifier clean-css uglifyjs typescript tsd bower browserstack browserify
RUN pip install beautifulsoup4 html5lib


VOLUME /cyph
WORKDIR /cyph/scripts

EXPOSE 8080
EXPOSE 8081
EXPOSE 8082
EXPOSE 8083


CMD /bin/bash
