FROM google/cloud-sdk

MAINTAINER Ryan Lester <hacker@linux.com>

LABEL Name="cyph"

RUN apt-get -y --force-yes update
RUN apt-get -y --force-yes install apt-transport-https curl lsb-release

ENV debianVersion "echo $(lsb_release -c | awk '{print \$2}')"
ENV debianBackports "${debianVersion}-backports"
RUN dpkg --add-architecture i386
RUN echo "deb http://ftp.debian.org/debian $(eval "${debianBackports}") main" >> /etc/apt/sources.list
RUN echo "deb https://deb.nodesource.com/node_6.x $(eval "${debianVersion}") main" >> /etc/apt/sources.list
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -

RUN apt-get -y --force-yes update
RUN apt-get -y --force-yes dist-upgrade

RUN apt-get -y --force-yes -t $(eval "${debianBackports}") install \
	apt-utils \
	autoconf \
	automake \
	build-essential \
	cmake \
	devscripts \
	expect \
	g++ \
	git \
	gnupg \
	gnupg-agent \
	golang-go \
	inotify-tools \
	lib32ncurses5 \
	lib32z1 \
	libbz2-1.0:i386 \
	libstdc++6:i386 \
	libtool \
	nano \
	nodejs \
	openjdk-8-jdk \
	perl \
	pinentry-curses \
	procps \
	python \
	sudo \
	zopfli


RUN echo '\
	source /home/gibson/emsdk_portable/emsdk_env.sh > /dev/null 2>&1; \
	source /home/gibson/.rvm/scripts/rvm; \
\
	export NODE_PATH="/usr/lib/node_modules"; \
\
	export GOPATH="/home/gibson/go"; \
	export CLOUDSDK_PYTHON="python2"; \
	export CLOUD_PATHS="/google-cloud-sdk/bin:/google-cloud-sdk/platform/google_appengine:/google-cloud-sdk/platform/google_appengine/google/appengine/tools"; \
\
	export ANDROID_HOME="/home/gibson/androidsdk"; \
	export JAVA_HOME="$(update-alternatives --query javac | sed -n -e "s/Best: *\(.*\)\/bin\/javac/\\1/p")"; \
\
	export PATH="/opt/local/bin:/opt/local/sbin:/usr/local/opt/go/libexec/bin:$CLOUD_PATHS:$GOPATH/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"; \
\
	if [ ! -d ~/.gnupg -a -d ~/.gnupg.original ] ; then cp -a ~/.gnupg.original ~/.gnupg ; fi; \
	export GPG_TTY="$(tty)"; \
	eval $(gpg-agent --daemon 2> /dev/null) > /dev/null 2>&1; \
\
	eval $(ssh-agent 2> /dev/null) > /dev/null 2>&1; \
' >> /.bashrc

RUN echo 'gibson ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN useradd -ms /bin/bash gibson
RUN mkdir -p /home/gibson
RUN cp -f /.bashrc /home/gibson/.bashrc
RUN cp -f /.bashrc /root/.bashrc
RUN chmod 700 /home/gibson/.bashrc
USER gibson
ENV HOME /home/gibson


RUN bash -c ' \
	cd; \
	wget https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz; \
	tar xzf emsdk-portable.tar.gz; \
	rm emsdk-portable.tar.gz; \
	cd emsdk_portable; \
	./emsdk update; \
	./emsdk install latest; \
	./emsdk activate latest; \
	./emsdk uninstall $(./emsdk list | grep INSTALLED | grep node | awk "{print \$2}"); \
'

RUN bash -c ' \
	source ~/.bashrc; \
	ln -s $NODE_PATH /home/gibson/node_modules; \
	sudo ln -s $NODE_PATH /node_modules; \
	mkdir -p /home/gibson/emsdk_portable/node/4.1.1_64bit/bin; \
	ln -s /usr/bin/node /home/gibson/emsdk_portable/node/4.1.1_64bit/bin/node; \
'

RUN bash -c ' \
	cd; \
	git clone https://github.com/google/brotli.git; \
	cd brotli; \
	make; \
	sudo mv bin/bro /usr/bin/; \
	cd; \
	rm -rf brotli; \
'

RUN wget https://keybase.io/mpapis/key.asc -O ~/public.key
RUN gpg --import ~/public.key
RUN rm ~/public.key
RUN curl -sSL https://get.rvm.io | bash -s stable --ruby

RUN bash -c 'source ~/.bashrc ; gem install sass'

RUN rm -rf ~/.gnupg

RUN wget "$( \
	curl -s https://cloud.google.com/appengine/docs/go/download | \
	grep -oP 'https://.*?go_appengine_sdk_linux_amd64.*?\.zip' | \
	head -n1 \
)" -O ~/go_appengine.zip
RUN unzip ~/go_appengine.zip -d ~
RUN rm ~/go_appengine.zip

RUN mkdir ~/androidsdk
RUN wget https://dl.google.com/android/repository/tools_r25.2.3-linux.zip -O ~/androidsdk.zip
RUN unzip ~/androidsdk.zip -d ~/androidsdk
RUN rm ~/androidsdk.zip

RUN bash -c 'source ~/.bashrc ; echo y | android update sdk \
	--filter tools,platform-tools,android-22,build-tools-25.0.1,extra-android-m2repository,extra-google-m2repository,extra-android-support \
	--all \
	--no-ui \
'

RUN sudo bash -c 'source ~/.bashrc ; npm -g --unsafe-perm install \
	@angular/common@2.4.1 \
	@angular/compiler@2.4.1 \
	@angular/compiler-cli@2.4.1 \
	@angular/core@2.4.1 \
	@angular/platform-browser@2.4.1 \
	@angular/platform-server@2.4.1 \
	babel-core@6.21.0 \
	babel-cli@6.18.0 \
	babel-loader@6.2.10 \
	babel-preset-es2015@6.18.0 \
	browserify@13.1.1 \
	cheerio@0.22.0 \
	clean-css@3.4.23 \
	codelyzer@2.0.0-beta.4 \
	datauri@1.0.5  \
	htmlencode@0.0.4  \
	image-type@2.1.0 \
	html-minifier@3.2.3 \
	nativescript@2.5.0-2017-01-03-7551 \
	rxjs@5.0.2 \
	ts-node@1.7.2 \
	tslint@4.1.1 \
	tslint-microsoft-contrib@4.0.0 \
	typescript@2.0.10 \
	uglify-js@2.7.5 \
	webpack@2.2.0-rc.3 \
	zone.js@0.7.4 \
	browserstack \
	firebase \
	firebase-server \
	glob \
	gulp \
	jspm \
	libsodium-wrappers \
	mkdirp \
	node-fetch \
	read \
	supersphincs \
	typedoc \
	zombie \
'

# Workaround because ts-node env var support doesn't seem to work
RUN sudo bash -c " \
	mkdir -p /opt/ts-node/node_modules; \
	cd /opt/ts-node; \
	npm install typescript@2.1.4; \
	chmod -R 777 .; \
	cd /usr/bin; \
	mv ts-node ts-node-original; \
	echo -e '#!/bin/bash\nts-node-original -D -C /opt/ts-node/node_modules/typescript \"\${@}\"' > ts-node; \
	chmod +x ts-node; \
"


VOLUME /cyph
VOLUME /home/gibson/.cyph
VOLUME /home/gibson/.gitconfig
VOLUME /home/gibson/.gnupg.original
VOLUME /home/gibson/.ssh

WORKDIR /cyph/commands

EXPOSE 5000 5001 5002 31337 44000


CMD /bin/bash
