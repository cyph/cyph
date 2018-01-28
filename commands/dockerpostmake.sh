#!/bin/bash


~/google-cloud-sdk/install.sh \
	--additional-components app-engine-go \
	--command-completion false \
	--path-update false \
	--usage-reporting false

cat >> ~/.bashrc <<- EOM
	# Google Cloud SDK
	if [ -f ~/google-cloud-sdk/path.bash.inc ] ; then
		source ~/google-cloud-sdk/path.bash.inc
	fi
	if [ -f ~/google-cloud-sdk/completion.bash.inc ] ; then
		source ~/google-cloud-sdk/completion.bash.inc
	fi
EOM

source ~/.bashrc

gcloud components update --quiet

tns error-reporting disable
tns usage-reporting disable
