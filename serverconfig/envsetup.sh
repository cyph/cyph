#!/bin/bash

export DEBIAN_FRONTEND=noninteractive

sudo apt-get update
sudo apt-get dist-upgrade -y

sudo apt-get install -y \
	curl wget build-essential git gnupg \
	golang ruby nodejs npm \
	linux-firmware-nonfree firmware-b43-installer b43-fwcutter \
	gimp chromium-browser

sudo su -c 'wget -qO- https://get.docker.com/ | sh'

sudo gem install sass

sudo npm -g install typescript

wget "$(curl -s 'http://www.sublimetext.com/3' | grep -o 'http.*amd64\.deb')" -O sublime.deb
sudo dpkg -i sublime.deb
rm sublime.deb

curl -s 'https://packagecontrol.io/installation' | \
	tr '\n' ' ' | \
	perl -pe 's/.*<p class="code st3">\s+<code>\s+(.*?)\s+<\/code>\s+<\/p>.*/\1/g' \
	> balls
subl balls
sleep 1
rm balls
