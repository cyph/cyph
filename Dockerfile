FROM google/cloud-sdk

MAINTAINER Ryan Lester <hacker@linux.com>

LABEL Name="cyph"

RUN apt-get update
RUN apt-get dist-upgrade -y

RUN apt-get install -y curl python python-pip perl devscripts build-essential git gnupg procps sudo

RUN curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get install -y nodejs

RUN bash -c ' \
	mkdir /golang; \
	cd /golang; \
	apt-get build-dep -y golang; \
	apt-get install -y bison ed; \
	wget http://ftp.de.debian.org/debian/pool/main/g/golang/golang_1.3.3-1.dsc; \
	wget http://ftp.de.debian.org/debian/pool/main/g/golang/golang_1.3.3.orig.tar.gz; \
	wget http://ftp.de.debian.org/debian/pool/main/g/golang/golang_1.3.3-1.debian.tar.xz; \
	dpkg-source -x golang_1.3.3-1.dsc; \
	cd golang-1.3.3; \
	debuild -us -uc; \
	cd ..; \
	dpkg -i golang-go_*_amd64.deb golang-src_*_amd64.deb golang-go-linux-amd64_*_amd64.deb; \
	cd /; \
	rm -rf /golang; \
'

RUN npm -g install html-minifier clean-css uglifyjs typescript tsd typedoc bower browserstack browserify libsodium-wrappers glob read
RUN pip install beautifulsoup4 html5lib


RUN echo '\
	source ~/.rvm/scripts/rvm; \
\
	export NODE_PATH="/usr/lib/node_modules/"; \
\
	export GOPATH=$HOME/go; \
	export CLOUDSDK_PYTHON=python2; \
	alias goapp="~/.config/google-cloud-sdk/platform/google_appengine/goapp"; \
\
	export PATH="/opt/local/bin:/opt/local/sbin:/usr/local/opt/go/libexec/bin:$GOPATH/bin:$PATH"; \
' >> /.bashrc

RUN yes | /google-cloud-sdk/bin/gcloud components update

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
	gem install specific_install sass jekyll:1.5.1 jekyll-assets:0.9.2 github-pages:20 maruku rake uglifier; \
	gem specific_install -l https://github.com/buu700/fake_sqs; \
'

RUN sudo ln -s /usr/bin/md5sum /usr/bin/md5

RUN rm -rf ~/.gnupg

RUN bash -c ' \
	source ~/.bashrc; \
	go get github.com/gorilla/context; \
	go get github.com/gorilla/mux; \
	go get github.com/microcosm-cc/bluemonday; \
'


VOLUME /cyph
VOLUME /home/gibson/.cyph
VOLUME /home/gibson/.gitconfig
VOLUME /home/gibson/.gnupg
VOLUME /home/gibson/.ssh

WORKDIR /cyph/commands

EXPOSE 5000 5001 5002 5003 5004 4568


CMD /bin/bash
