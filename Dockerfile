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
RUN echo 'deb https://dl.yarnpkg.com/debian/ stable main' >> /etc/apt/sources.list
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN curl -s https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -

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
	yarn \
	zopfli


RUN echo '\
	source /home/gibson/emsdk_portable/emsdk_env.sh > /dev/null 2>&1; \
	source /home/gibson/.rvm/scripts/rvm; \
\
	export NODE_PATH="/cyph/shared/lib/js/node_modules"; \
\
	export GOPATH="/home/gibson/go"; \
	export CLOUDSDK_PYTHON="python2"; \
	export CLOUD_PATHS="$( \
		echo -n "/google-cloud-sdk/bin:"; \
		echo -n "/google-cloud-sdk/platform/google_appengine:"; \
		echo -n "/google-cloud-sdk/platform/google_appengine/google/appengine/tools"; \
	)"; \
\
	export ANDROID_HOME="/home/gibson/androidsdk"; \
	export JAVA_HOME="$(update-alternatives --query javac | sed -n -e "s/Best: *\(.*\)\/bin\/javac/\\1/p")"; \
\
	export PATH="$( \
		echo -n "/opt/local/bin:"; \
		echo -n "/opt/local/sbin:"; \
		echo -n "/usr/local/opt/go/libexec/bin:"; \
		echo -n "${CLOUD_PATHS}:"; \
		echo -n "${GOPATH}/bin:"; \
		echo -n "${ANDROID_HOME}/platform-tools:"; \
		echo -n "${ANDROID_HOME}/tools:"; \
		echo -n "${PATH}:"; \
		echo -n "${NODE_PATH}/.bin"; \
	)"; \
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

RUN bash -c ' \
	source ~/.bashrc; \
	mv $ANDROID_HOME/tools $ANDROID_HOME/balls; \
	ln -s $ANDROID_HOME/balls $ANDROID_HOME/tools; \
	echo y | $ANDROID_HOME/balls/android update sdk --all --no-ui \
		--filter tools,platform-tools,android-22,build-tools-25.0.1,extra-android-m2repository,extra-google-m2repository \
	; \
	rm -rf $ANDROID_HOME/balls; \
'

# Workaround because ts-node env var support doesn't seem to work
RUN sudo bash -c ' \
	source ~/.bashrc; \
	mkdir -p /opt/ts-node/node_modules; \
	cd /opt/ts-node; \
	yarn add typescript@2.1.5; \
	chmod -R 777 .; \
	cd /usr/bin; \
	echo -e \
		"#!/bin/bash\n${NODE_PATH}/.bin/ts-node -D -C /opt/ts-node/node_modules/typescript \"\${@}\"" \
	> ts-node; \
	chmod +x ts-node; \
'

RUN rm -rf ~/.gnupg


#CIRCLECI:RUN mkdir -p ~/getlibs/shared/lib/js/module_locks/firebase
#CIRCLECI:RUN echo 'GETLIBS_BASE64' | base64 --decode > ~/getlibs/shared/getlibs.sh
#CIRCLECI:RUN echo 'PACKAGE_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/package.json
#CIRCLECI:RUN echo 'LOCK_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/yarn.lock
#CIRCLECI:RUN echo 'FB_PACKAGE_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/module_locks/firebase/package.json
#CIRCLECI:RUN echo 'FB_LOCK_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/module_locks/firebase/yarn.lock
#CIRCLECI:RUN git clone --depth 1 https://github.com/jedisct1/libsodium.js ~/getlibs/shared/lib/js/libsodium
#CIRCLECI:RUN chmod -R 777 ~/getlibs
#CIRCLECI:RUN ~/getlibs/shared/getlibs.sh
#CIRCLECI:RUN echo 'cp -a ~/getlibs/shared/lib/js/node_modules /cyph/shared/lib/js/' >> ~/.bashrc


VOLUME /cyph
VOLUME /home/gibson/.cyph
VOLUME /home/gibson/.gitconfig
VOLUME /home/gibson/.gnupg.original
VOLUME /home/gibson/.ssh

WORKDIR /cyph/commands

EXPOSE 5000 5001 5002 31337 44000


CMD /bin/bash
