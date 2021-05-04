FROM debian:buster

LABEL Name="cyph"

RUN apt-get -y --allow-downgrades update
RUN apt-get -y --allow-downgrades install \
	apt-transport-https \
	apt-utils \
	ca-certificates \
	curl \
	gnupg \
	lsb-release \
	software-properties-common

RUN echo "deb https://deb.nodesource.com/node_14.x buster main" >> /etc/apt/sources.list
RUN echo 'deb https://dl.yarnpkg.com/debian/ stable main' >> /etc/apt/sources.list
RUN echo 'deb https://packages.cloud.google.com/apt cloud-sdk main' >> /etc/apt/sources.list
RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN curl -s https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -

RUN apt-get -y --allow-downgrades update
RUN apt-get -y --allow-downgrades upgrade

RUN apt-get -y --allow-downgrades install \
	autoconf \
	automake \
	build-essential \
	chromium \
	cmake \
	devscripts \
	dos2unix \
	expect \
	gcc-8 \
	g++ \
	git \
	golang-go \
	google-cloud-sdk \
	haxe \
	htop \
	imagemagick \
	inotify-tools \
	jq \
	libgbm-dev \
	libgconf-2-4 \
	libglew-dev \
	libglu1-mesa-dev \
	libsodium-dev \
	libtool \
	libxi-dev \
	libxss1 \
	mono-complete \
	nano \
	nodejs \
	openjdk-11-jdk \
	perl \
	pinentry-curses \
	pkg-config \
	procps \
	python \
	python-docutils \
	python-pip \
	ripgrep \
	rpm \
	rsync \
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

RUN echo '\
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
	if [ ! -f ~/.gnupg/keycache -a -d ~/.gnupg.original ] ; then \
		rm -rf ~/.gnupg 2> /dev/null; \
		cp -a ~/.gnupg.original ~/.gnupg; \
	fi; \
	export GPG_TTY="$(tty)"; \
	eval $(gpg-agent --daemon 2> /dev/null) &> /dev/null; \
\
	eval $(ssh-agent 2> /dev/null) &> /dev/null; \
\
	if [ -f /cyph/commands/.bashrc ] ; then \
		source /cyph/commands/.bashrc; \
	elif [ -f ~/getlibs/commands/.bashrc ] ; then \
		source ~/getlibs/commands/.bashrc; \
	fi \
' >> /.bashrc

RUN echo 'gibson ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN useradd -ms /bin/bash gibson
RUN mkdir -p /home/gibson
RUN cp -f /.bashrc /home/gibson/.bashrc
RUN cp -f /.bashrc /root/.bashrc
RUN chmod 700 /home/gibson/.bashrc
USER gibson
ENV HOME /home/gibson


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


#SETUP:RUN sudo apt-get -y --allow-downgrades update
#SETUP:RUN sudo apt-get -y --allow-downgrades upgrade
#SETUP:RUN mkdir -p ~/getlibs/commands ~/getlibs/native ~/getlibs/shared/lib/js
#SETUP:BASE64_FILES
#SETUP:RUN chmod -R 777 ~/getlibs
#SETUP:RUN ~/getlibs/commands/updatedockerimage.sh
#SETUP:RUN ~/getlibs/commands/getlibs.sh
#SETUP:RUN ~/getlibs/commands/dockerpostmake.sh
#CIRCLECI:RUN sudo mkdir /cyph
#CIRCLECI:RUN sudo chmod 777 /cyph


VOLUME /cyph
VOLUME /home/gibson/.cyph
VOLUME /home/gibson/.gnupg.original
VOLUME /home/gibson/.ssh

WORKDIR /cyph/commands

EXPOSE 9005 9876 31337 42000 42001 42002 42003 44000


CMD /bin/bash
