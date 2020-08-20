#!/bin/bash


source ~/.bashrc

sudo apt-get -y --allow-downgrades update
sudo apt-get -y --allow-downgrades upgrade
sudo apt-get -y --allow-downgrades clean

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

source ~/emsdk/emsdk_env.sh &> /dev/null
bash -c 'cd ~/emsdk ; git pull'
emsdk install latest-upstream
emsdk activate latest-upstream

cd
rm -rf go-ipfs go-ipfs.tar.gz 2> /dev/null
wget "$(node -e "(async () => console.log(
	(await require('node-fetch')(
		'https://api.github.com/repos/ipfs/go-ipfs/releases/latest'
	).then(o => o.json())).assets.find(o =>
		o.browser_download_url.endsWith('_linux-amd64.tar.gz')
	).browser_download_url
))()")" -O go-ipfs.tar.gz
tar xvzf go-ipfs.tar.gz
cd go-ipfs
sudo bash install.sh
cd
rm -rf go-ipfs go-ipfs.tar.gz
if [ ! -d ~/.ipfs ] ; then
	ipfs init
fi


~/google-cloud-sdk/install.sh \
	--additional-components app-engine-go cloud-datastore-emulator \
	--command-completion false \
	--path-update false \
	--usage-reporting false

source ~/google-cloud-sdk/path.bash.inc

gcloud components update --quiet

echo | haxelib update > /dev/null

touch ~/.updated
