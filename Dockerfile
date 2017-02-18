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
RUN echo 'deb http://httpredir.debian.org/debian unstable main' >> /etc/apt/sources.list
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN curl -s https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -

RUN echo 'Package: *' > /etc/apt/preferences.d/unstable
RUN echo 'Pin: release a=unstable' >> /etc/apt/preferences.d/unstable
RUN echo 'Pin-Priority: 100' >> /etc/apt/preferences.d/unstable
RUN echo >> /etc/apt/preferences.d/unstable
RUN echo 'Package: haxe neko libneko*' >> /etc/apt/preferences.d/unstable
RUN echo 'Pin: release a=unstable' >> /etc/apt/preferences.d/unstable
RUN echo 'Pin-Priority: 999' >> /etc/apt/preferences.d/unstable

RUN apt-get -y --force-yes update
RUN apt-get -y --force-yes upgrade

RUN apt-get -y --force-yes install haxe
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
	mono-complete \
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
		echo -n "/node_modules/.bin"; \
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

RUN mkdir ~/haxelib
RUN haxelib setup ~/haxelib
RUN haxelib install hxcpp
RUN haxelib install hxcs
RUN haxelib install hxjava
RUN haxelib install hxnodejs

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

RUN rm -rf ~/.gnupg


# Temporary workaround for https://github.com/yarnpkg/yarn/issues/2692
RUN echo -e 'Package: yarn\nPin: version 0.19.1-1\nPin-Priority: 1337' | sudo tee -a /etc/apt/preferences


#CIRCLECI:RUN mkdir -p ~/getlibs/shared/lib/js/module_locks/firebase
#CIRCLECI:RUN mkdir -p ~/getlibs/shared/lib/js/module_locks/firebase-server
#CIRCLECI:RUN mkdir -p ~/getlibs/shared/lib/js/module_locks/ts-node
#CIRCLECI:RUN mkdir -p ~/getlibs/shared/lib/js/module_locks/tslint
#CIRCLECI:RUN echo 'GETLIBS_BASE64' | base64 --decode > ~/getlibs/shared/getlibs.sh
#CIRCLECI:RUN echo 'PACKAGE_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/package.json
#CIRCLECI:RUN touch ~/getlibs/shared/lib/js/yarn.lock
#CIRCLECI:RUN echo 'FB_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/module_locks/firebase/package.json
#CIRCLECI:RUN touch ~/getlibs/shared/lib/js/module_locks/firebase/yarn.lock
#CIRCLECI:RUN echo 'FBS_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/module_locks/firebase-server/package.json
#CIRCLECI:RUN touch ~/getlibs/shared/lib/js/module_locks/firebase-server/yarn.lock
#CIRCLECI:RUN echo 'TSN_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/module_locks/ts-node/package.json
#CIRCLECI:RUN touch ~/getlibs/shared/lib/js/module_locks/ts-node/yarn.lock
#CIRCLECI:RUN echo 'TSL_BASE64' | base64 --decode > ~/getlibs/shared/lib/js/module_locks/tslint/package.json
#CIRCLECI:RUN touch ~/getlibs/shared/lib/js/module_locks/tslint/yarn.lock
#CIRCLECI:RUN git clone --depth 1 https://github.com/jedisct1/libsodium.js ~/getlibs/shared/lib/js/libsodium
#CIRCLECI:RUN chmod -R 777 ~/getlibs
#CIRCLECI:RUN ~/getlibs/shared/getlibs.sh
#CIRCLECI:RUN echo 'cp /node_modules/babel-polyfill/dist/polyfill.js /cyph/shared/lib/js/base.js' >> ~/.bashrc


VOLUME /cyph
VOLUME /home/gibson/.cyph
VOLUME /home/gibson/.gitconfig
VOLUME /home/gibson/.gnupg.original
VOLUME /home/gibson/.ssh

WORKDIR /cyph/commands

EXPOSE 5000 5001 5002 31337 44000


CMD /bin/bash
