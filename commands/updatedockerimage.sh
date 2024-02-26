#!/bin/bash


source ~/.bashrc

sudo tee -a /etc/apt/sources.list.d/cyph.list > /dev/null <<- EOM
	deb https://deb.debian.org/debian bookworm-backports main
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
	golang-1.21/bookworm-backports \
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
	openjdk-17-jdk \
	perl \
	pinentry-curses \
	pkg-config \
	procps \
	protobuf-compiler \
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

if [ ! -f /usr/bin/python ] ; then
	sudo ln -s /usr/bin/python3 /usr/bin/python
fi

git config --global --add safe.directory /cyph

sudo pip install -U grpcio

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
	downloadAndVerifyHash \
		'https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-465.0.0-linux-ARCH.tar.gz' \
		'{
			"arm64": [
				"arm", "d95e9895a01bc23ca23d16c174363756f59ddbecf5ed5e5b7aec38de82774ff8b4bb3eb7f65a71080dba000e7fae2e2f23906b0e3bb73eca35ffcf8c37bd4c8c"
			],
			"x64": [
				"x86_64",
				"d2a7e8f0f762ffff2914b1e4e8944b37c09f8bb8aabf371c92000910530ec59e71620b9133d32dfc3cfe415c15a32a8b94f9acb9b63940a755248f7a2f320a78"
			]
		}' \
		~/gcloud-sdk.tar.gz

	tar xvzf ~/gcloud-sdk.tar.gz -C ~
	rm ~/gcloud-sdk.tar.gz
fi

~/google-cloud-sdk/install.sh \
	--additional-components app-engine-go beta cloud-datastore-emulator \
	--command-completion false \
	--path-update false \
	--usage-reporting false

source ~/google-cloud-sdk/path.bash.inc
gcloud components update --quiet
