#!/bin/bash


source ~/.bashrc

sudo apt-get -y --allow-downgrades update
sudo apt-get -y --allow-downgrades upgrade
sudo apt-get -y --allow-downgrades clean

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

cd
rm -rf go-ipfs go-ipfs.tar.gz 2> /dev/null
wget "$(
	curl -s https://api.github.com/repos/ipfs/go-ipfs/releases/latest | jq -r '
		.assets |
		map(
			.browser_download_url |
			select(endswith("linux-$(
				if [ "$(arch)" == aarch64 ] ; then echo arm64 ; else echo amd64 ; fi
			).tar.gz"))
		)[0]
	'
)" -O go-ipfs.tar.gz
tar xvzf go-ipfs.tar.gz
cd go-ipfs
sudo bash install.sh
cd
rm -rf go-ipfs go-ipfs.tar.gz
if [ ! -d ~/.ipfs ] ; then
	ipfs init
fi


go install github.com/mitranim/gow@latest

# app-engine-go currently fails on ARM, but the others work
for component in app-engine-go beta cloud-datastore-emulator ; do
	~/google-cloud-sdk/install.sh \
		--additional-components ${component} \
		--command-completion false \
		--path-update false \
		--usage-reporting false
done

source ~/google-cloud-sdk/path.bash.inc
gcloud components update --quiet

touch ~/.updated
