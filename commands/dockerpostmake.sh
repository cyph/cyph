#!/bin/bash


cd

./google-cloud-sdk/install.sh \
	--additional-components app-engine-go \
	--command-completion true \
	--path-update true \
	--rc-path ~/.bashrc \
	--usage-reporting false

source ~/.bashrc

gcloud components update --quiet

tns error-reporting disable
tns usage-reporting disable
