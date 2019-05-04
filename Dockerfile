FROM debian:stretch

LABEL Name="cyph"

RUN apt-get -y --allow-downgrades update
RUN apt-get -y --allow-downgrades install apt-transport-https apt-utils curl gnupg lsb-release

RUN dpkg --add-architecture i386
RUN echo "deb https://deb.nodesource.com/node_10.x stretch main" >> /etc/apt/sources.list
RUN echo 'deb https://dl.yarnpkg.com/debian/ stable main' >> /etc/apt/sources.list
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN curl -s https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -

RUN apt-get -y --allow-downgrades update
RUN apt-get -y --allow-downgrades upgrade

RUN apt-get -y --allow-downgrades install \
	autoconf \
	automake \
	build-essential \
	cmake \
	devscripts \
	expect \
	gcc-6 \
	g++ \
	git \
	golang-go \
	haxe \
	inotify-tools \
	lib32ncurses5 \
	lib32z1 \
	libbz2-1.0:i386 \
	libgconf-2-4 \
	libsodium-dev \
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
	python-pip \
	ruby \
	ruby-dev \
	shellcheck \
	sudo \
	tightvncserver \
	wget \
	yarn \
	zopfli

RUN apt-get -y --allow-downgrades update
RUN apt-get -y --allow-downgrades upgrade
RUN apt-get -y --allow-downgrades autoremove

RUN pip install grpcio
RUN gem update
RUN gem install sass

RUN echo '\
	source /home/gibson/emsdk-portable/emsdk_env.sh &> /dev/null; \
\
	export GIT_EDITOR="vim"; \
	export GOPATH="/home/gibson/go"; \
	export ANDROID_HOME="/home/gibson/androidsdk"; \
	export JAVA_HOME="$( \
		update-alternatives --query javac | sed -n -e "s/Best: *\(.*\)\/bin\/javac/\\1/p" \
	)"; \
\
	export PATH="$( \
		echo -n "/opt/local/bin:"; \
		echo -n "/opt/local/sbin:"; \
		echo -n "/usr/local/opt/go/libexec/bin:"; \
		echo -n "${GOPATH}/bin:"; \
		echo -n "${ANDROID_HOME}/platform-tools:"; \
		echo -n "${ANDROID_HOME}/tools:"; \
		echo -n "${PATH}:"; \
		echo -n "/node_modules/.bin"; \
	)"; \
\
	if [ ! -d ~/.gnupg -a -d ~/.gnupg.original ] ; then cp -a ~/.gnupg.original ~/.gnupg ; fi; \
	export GPG_TTY="$(tty)"; \
	eval $(gpg-agent --daemon 2> /dev/null) &> /dev/null; \
\
	eval $(ssh-agent 2> /dev/null) &> /dev/null; \
\
	if [ -f /cyph/commands/.bashrc ] ; then source /cyph/commands/.bashrc ; fi \
' >> /.bashrc

RUN echo 'gibson ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN useradd -ms /bin/bash gibson
RUN mkdir -p /home/gibson
RUN cp -f /.bashrc /home/gibson/.bashrc
RUN cp -f /.bashrc /root/.bashrc
RUN chmod 700 /home/gibson/.bashrc
USER gibson
ENV HOME /home/gibson


RUN wget \
	https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz \
	-O ~/emsdk.tar.gz
RUN wget \
	https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-150.0.0-linux-x86_64.tar.gz \
	-O ~/gcloud-sdk.tar.gz
RUN ls ~/*.tar.gz | xargs -I% tar xvzf % -C ~
RUN rm ~/*.tar.gz

#RUN mkdir ~/androidsdk
#RUN wget https://dl.google.com/android/repository/tools_r25.2.5-linux.zip -O ~/androidsdk.zip
#RUN unzip ~/androidsdk.zip -d ~/androidsdk
#RUN rm ~/androidsdk.zip
#RUN bash -c ' \
#	source ~/.bashrc; \
#	mv $ANDROID_HOME/tools $ANDROID_HOME/balls; \
#	ln -s $ANDROID_HOME/balls $ANDROID_HOME/tools; \
#	yes | $ANDROID_HOME/tools/bin/sdkmanager --licenses; \
#	$ANDROID_HOME/tools/bin/sdkmanager \
#		"tools" \
#		"platform-tools" \
#		"platforms;android-25" \
#		"build-tools;25.0.2" \
#		"extras;android;m2repository" \
#		"extras;google;m2repository" \
#	; \
#	rm -rf $ANDROID_HOME/balls; \
#'

RUN mkdir ~/haxelib
RUN haxelib setup ~/haxelib
RUN haxelib install hxcpp
RUN haxelib install hxcs
RUN haxelib install hxjava
RUN haxelib install hxnodejs

RUN rm -rf ~/.gnupg


#CIRCLECI:RUN sudo apt-get -y --allow-downgrades update
#CIRCLECI:RUN sudo apt-get -y --allow-downgrades upgrade
#CIRCLECI:RUN mkdir -p ~/getlibs/commands ~/getlibs/native ~/getlibs/shared/lib/js
#CIRCLECI:BASE64_FILES
#CIRCLECI:RUN chmod -R 777 ~/getlibs
#CIRCLECI:RUN ~/getlibs/commands/updatedockerimage.sh
#CIRCLECI:RUN ~/getlibs/commands/getlibs.sh
#CIRCLECI:RUN ~/getlibs/commands/dockerpostmake.sh
#CIRCLECI:RUN sudo mkdir /cyph
#CIRCLECI:RUN sudo chmod 777 /cyph


VOLUME /cyph
VOLUME /home/gibson/.cyph
VOLUME /home/gibson/.gitconfig
VOLUME /home/gibson/.gnupg.original
VOLUME /home/gibson/.ssh

WORKDIR /cyph/commands

EXPOSE 9005 9876 31337 42000 42001 42002 44000


CMD /bin/bash
