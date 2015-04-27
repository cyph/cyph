FROM google/cloud-sdk

MAINTAINER Ryan Lester <hacker@linux.com>

LABEL Name="cyph"

RUN apt-get update
RUN apt-get dist-upgrade -y

RUN apt-get install -y curl python python-pip perl golang-go build-essential git gnupg procps sudo

RUN curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get install -y nodejs


RUN npm -g install html-minifier clean-css uglifyjs typescript tsd bower browserstack browserify
RUN pip install beautifulsoup4 html5lib


RUN echo '\
	source ~/.rvm/scripts/rvm; \
\
	export GOPATH=$HOME/go; \
	export CLOUDSDK_PYTHON=python2; \
	alias goapp="~/.config/google-cloud-sdk/platform/google_appengine/goapp"; \
\
	export PATH="/opt/local/bin:/opt/local/sbin:/usr/local/opt/go/libexec/bin:$GOPATH/bin:$PATH"; \
' >> /.bashrc

RUN echo 'gibson ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN useradd -ms /bin/bash gibson
RUN mkdir -p /home/gibson
RUN cp /.bashrc /home/gibson/
RUN chmod 700 ~/.bashrc
USER gibson
ENV HOME /home/gibson


RUN wget https://keybase.io/mpapis/key.asc -O ~/public.key
RUN gpg --import ~/public.key
RUN rm ~/public.key
RUN curl -sSL https://get.rvm.io | bash -s stable --ruby

RUN bash -c ' \
	source ~/.bashrc; \
	gem install sass specific_install; \
	gem specific_install -l https://github.com/buu700/fake_sqs; \
'

RUN bash -c ' \
	source ~/.bashrc; \
	go get github.com/gorilla/context; \
	go get github.com/gorilla/mux; \
'


VOLUME /cyph
WORKDIR /cyph/scripts

EXPOSE 8080 8081 8082 8083 4568


CMD /bin/bash
