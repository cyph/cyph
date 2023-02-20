#!/bin/bash


source ~/.bashrc

sudo tee -a /etc/apt/sources.list.d/cyph.list > /dev/null <<- EOM
	deb https://deb.debian.org/debian bullseye-backports main
	deb https://dl.yarnpkg.com/debian stable main
EOM

curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | sudo apt-key add -
curl -s https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -

sudo apt-get -y --allow-downgrades update
sudo apt-get -y --allow-downgrades upgrade

sudo apt-get -y --allow-downgrades install \
	autoconf \
	automake \
	build-essential \
	chromium \
	cmake \
	devscripts \
	dos2unix \
	expect \
	g++ \
	gcc \
	git \
	golang-1.16/bullseye-backports \
	htop \
	imagemagick \
	inotify-tools \
	jq \
	libcairo2-dev \
	libgbm-dev \
	libgconf-2-4 \
	libgif-dev \
	libglew-dev \
	libglu1-mesa-dev \
	libjpeg-dev \
	libpango1.0-dev \
	librsvg2-dev \
	libsodium-dev \
	libtool \
	libxi-dev \
	libxss1 \
	maven \
	nano \
	nodejs \
	openjdk-11-jdk \
	perl \
	pinentry-curses \
	pkg-config \
	procps \
	protobuf-compiler \
	python \
	python3 \
	python3-docutils \
	python3-pip \
	ripgrep \
	rpm \
	rsync \
	shellcheck \
	tightvncserver \
	wget \
	yarn \
	zopfli \
|| fail

sudo apt-get -y --allow-downgrades update
sudo apt-get -y --allow-downgrades upgrade
sudo apt-get -y --allow-downgrades autoremove
sudo apt-get -y --allow-downgrades clean

git config --global --add safe.directory /cyph

sudo pip install -U grpcio

if [ ! -f /usr/bin/chromium-browser ] ; then
	sudo ln -s /usr/bin/chromium /usr/bin/chromium-browser
fi

sudo npm -g install npm
sudo npm -g install @mapbox/node-pre-gyp

while [ ! -d ~/brotli ] ; do
	git clone https://github.com/google/brotli.git ~/brotli
done
cd ~/brotli
git pull
make clean
make brotli
sudo mv bin/brotli /usr/bin/

while [ ! -d ~/argbash ] ; do
	git clone https://github.com/matejak/argbash.git ~/argbash
done
cd ~/argbash
git pull
cd resources
sudo make install PREFIX=/usr

while [ ! -d ~/emsdk ] ; do
	git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
done
cd ~/emsdk
git pull
source ~/emsdk/emsdk_env.sh &> /dev/null
emsdk install latest-upstream
emsdk activate latest-upstream
sed -i "s/NODE_JS = .*/NODE_JS = '\/usr\/bin\/node'/" ~/emsdk/.emscripten


if [ ! -d ~/google-cloud-sdk ] ; then
	wget \
		"https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-392.0.0-linux-$( \
			if [ "$(arch)" == aarch64 ] ; then echo arm ; else echo x86_64 ; fi \
		).tar.gz" \
		-O ~/gcloud-sdk.tar.gz
	ls ~/*.tar.gz | xargs -I% tar xvzf % -C ~
	rm ~/*.tar.gz
fi

~/google-cloud-sdk/install.sh \
	--additional-components app-engine-go beta cloud-datastore-emulator \
	--command-completion false \
	--path-update false \
	--usage-reporting false

source ~/google-cloud-sdk/path.bash.inc
gcloud components update --quiet
