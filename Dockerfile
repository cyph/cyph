FROM google/cloud-sdk

MAINTAINER Ryan Lester <hacker@linux.com>

LABEL Name="cyph"

RUN apt-get -y --force-yes update
RUN apt-get -y --force-yes install curl lsb-release apt-transport-https

RUN echo " \
	deb https://deb.nodesource.com/node_6.x $(lsb_release -c | awk '{print $2}') main \
" >> /etc/apt/sources.list
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -

RUN apt-get -y --force-yes update
RUN apt-get -y --force-yes dist-upgrade

RUN apt-get -y --force-yes install \
	nano \
	nodejs \
	golang-go \
	python \
	perl \
	devscripts \
	build-essential \
	cmake \
	autoconf \
	automake \
	libtool \
	git \
	gnupg \
	gnupg-agent \
	pinentry-curses \
	procps \
	sudo \
	apt-utils \
	expect \
	inotify-tools \
	zopfli


RUN echo '\
	source ~/emsdk_portable/emsdk_env.sh > /dev/null 2>&1; \
	source ~/.rvm/scripts/rvm; \
\
	export NODE_PATH="/usr/lib/node_modules/"; \
\
	export GOPATH=$HOME/go; \
	export CLOUDSDK_PYTHON=python2; \
	export CLOUD_PATHS="/google-cloud-sdk/bin:/google-cloud-sdk/platform/google_appengine:/google-cloud-sdk/platform/google_appengine/google/appengine/tools"; \
\
	export PATH="/opt/local/bin:/opt/local/sbin:/usr/local/opt/go/libexec/bin:$CLOUD_PATHS:$GOPATH/bin:$PATH"; \
\
	if [ ! -d ~/.gnupg ] ; then cp -a ~/.gnupg.original ~/.gnupg ; fi; \
	export GPG_TTY=$(tty); \
	eval $(gpg-agent --daemon 2> /dev/null) > /dev/null 2>&1; \
\
	eval $(ssh-agent 2> /dev/null) > /dev/null 2>&1; \
' >> /.bashrc

RUN echo 'gibson ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN useradd -ms /bin/bash gibson
RUN mkdir -p /home/gibson
RUN cp /.bashrc /home/gibson/
RUN chmod 700 ~/.bashrc
USER gibson
ENV HOME /home/gibson


RUN wget "$( \
	curl -s https://cloud.google.com/appengine/docs/go/download | \
	grep -oP 'https://.*?go_appengine_sdk_linux_amd64.*?\.zip' | \
	head -n1 \
)" -O ~/go_appengine.zip
RUN unzip ~/go_appengine.zip -d ~
RUN rm ~/go_appengine.zip

RUN bash -c ' \
	cd; \
	wget https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz; \
	tar xzf emsdk-portable.tar.gz; \
	cd emsdk_portable; \
	./emsdk update; \
	./emsdk install latest; \
	./emsdk activate latest; \
	./emsdk uninstall $(./emsdk list | grep INSTALLED | grep node | awk "{print \$2}"); \
'

RUN bash -c ' \
	source ~/.bashrc; \
	ln -s $NODE_PATH $HOME/node_modules; \
	sudo ln -s $NODE_PATH /node_modules; \
	mkdir -p /home/gibson/emsdk_portable/node/4.1.1_64bit/bin; \
	ln -s /usr/bin/node /home/gibson/emsdk_portable/node/4.1.1_64bit/bin/node; \
'

RUN wget https://keybase.io/mpapis/key.asc -O ~/public.key
RUN gpg --import ~/public.key
RUN rm ~/public.key
RUN curl -sSL https://get.rvm.io | bash -s stable --ruby

RUN bash -c ' \
	source ~/.bashrc; \
	gem install sass; \
'

RUN rm -rf ~/.gnupg

RUN bash -c ' \
	cd; \
	git clone https://github.com/google/brotli.git; \
	cd brotli; \
	make; \
	sudo mv bin/bro /usr/bin/; \
	cd; \
	rm -rf brotli; \
'

RUN sudo npm -g install \
	@angular/common@2.2.0 \
	@angular/compiler@2.2.0 \
	@angular/compiler-cli@2.2.0 \
	@angular/core@2.2.0 \
	@angular/platform-browser@2.2.0 \
	@angular/platform-server@2.2.0 \
	babel-cli@6.16.0 \
	babel-preset-es2015@6.16.0 \
	browserify@13.1.1 \
	cheerio@0.22.0 \
	clean-css@3.4.20 \
	datauri@1.0.4  \
	htmlencode@0.0.4  \
	image-type@2.1.0 \
	html-minifier@3.1.0 \
	rxjs@5.0.0-beta.12 \
	typescript@2.0.9 \
	uglify-js@2.7.4 \
	webpack@2.1.0-beta.25 \
	zone.js@0.6.26 \
	browserstack \
	firebase \
	firebase-server \
	glob \
	jspm \
	libsodium-wrappers \
	mkdirp \
	node-fetch \
	read \
	supersphincs \
	typedoc \
	typings \
	zombie


VOLUME /cyph
VOLUME /home/gibson/.cyph
VOLUME /home/gibson/.gitconfig
VOLUME /home/gibson/.gnupg.original
VOLUME /home/gibson/.ssh

WORKDIR /cyph/commands

EXPOSE 5000 5001 5002 31337 44000


CMD /bin/bash
