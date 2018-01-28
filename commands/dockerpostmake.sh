#!/bin/bash


source ~/.bashrc

tns error-reporting disable
tns usage-reporting disable

~/google-cloud-sdk/install.sh \
	--additional-components app-engine-go \
	--command-completion true \
	--path-update true \
	--rc-path ~/.bashrc \
	--usage-reporting false

source ~/.bashrc
gcloud components update --quiet
