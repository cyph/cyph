#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/../serverconfig


if [ ! -f "${1}.sh" ] ; then
	fail 'fak u gooby'
fi


read -r -d '' script <<- EOM
#!/bin/bash

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades upgrade

apt-get -y --allow-downgrades install apt-utils
apt-get -y --allow-downgrades install \
	apt \
	apt-transport-https \
	build-essential \
	certbot \
	cron \
	curl \
	dpkg \
	git \
	gnupg2 \
	lsb-release \
	nano \
	nginx \
	openssl \
	psmisc \
	software-properties-common

apt-get -y --allow-downgrades purge apache* mysql*

distro="\$(lsb_release -c | awk '{print \$2}')"
echo "deb https://deb.nodesource.com/node_20.x \${distro} main" >> /etc/apt/sources.list
curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -

apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades upgrade
apt-get -y --allow-downgrades install nodejs

umask 077

cat > /init.sh << EndOfMessage
#!/bin/bash
/systemupdate.sh
# bash -c 'while true ; do /systemupdate.sh ; sleep 24h ; done' &
EndOfMessage

cat > /systemupdate.sh << EndOfMessage
#!/bin/bash
export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades -o Dpkg::Options::=--force-confdef upgrade
EndOfMessage

chmod 700 /init.sh /systemupdate.sh
umask 022

$(tail -n+2 "${1}.sh")
EOM


for f in $(echo "${script}" | grep -oP "'BASE64 .*?'" | perl -pe "s/'BASE64 (.*)'/\1/g") ; do
	script="$(echo "${script}" |
		sed "s|'BASE64 ${f}'|\"\$(echo '$(base64 "${f}" | perl -pe 's/\s//g')' ☁ base64 --decode)\"|g"
	)"
done

for var in $(echo "${script}" | grep -oP '^PROMPT .*' | sed 's|PROMPT ||g') ; do
	nano "${var}.var"
	script="$(echo "${script}" |
		sed "s|PROMPT ${var}|${var}=\"\$(echo '$(cat "${var}.var")' ☁ base64 --decode)\"|g"
	)"
	rm "${var}.var"
done

cat > Dockerfile <<- EOM
	FROM ubuntu:18.04

	LABEL Name="cyph-serverconfig-${1}"

	RUN echo '$(echo "${script}" |
		perl -pe 's/☁/|/g' |
		base64 |
		perl -pe 's/\s//g'
	)' | base64 --decode > script.sh
	RUN bash script.sh
	RUN rm script.sh

	CMD bash -c '/init.sh ; sleep Infinity'
EOM

echo " \
	HISTFILE= \
	$(cat Dockerfile | grep -P '^RUN ' | sed 's/^RUN / ; sudo /g' | tr '\n' ' ') ; \
	sudo bash -c ' \
		crontab -l > /tmp/cyph.cron ; \
		echo \"@reboot /init.sh\" >> /tmp/cyph.cron ; \
		crontab /tmp/cyph.cron ; \
		rm /tmp/cyph.cron ; \
		reboot \
	'
" |
	perl -pe 's/\s+/ /g' |
	perl -pe 's/\s*$//g' |
	perl -pe "s/-c ' /-c '/g" |
	perl -pe "s/ '$/'/g" |
	perl -pe 's/sudo echo/echo/g' \
> setup.txt

echo -n 'Submit Google Cloud Build? [y/N] '
read submit
if [ "${submit}" == 'y' ] ; then
	mkdir -p ~/cloudbuild-staging
	cp Dockerfile ~/cloudbuild-staging/
	cd ~/cloudbuild-staging
	gcloud builds submit --async --timeout 2h --tag "gcr.io/cyphme/cyph-serverconfig-${1}" .
fi
