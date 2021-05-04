#!/bin/bash


cat >> ~/.bashrc <<- EOM
	# Google Cloud SDK
	if [ -f ~/google-cloud-sdk/path.bash.inc ] ; then
		source ~/google-cloud-sdk/path.bash.inc
	fi
	if [ -f ~/google-cloud-sdk/completion.bash.inc ] ; then
		source ~/google-cloud-sdk/completion.bash.inc
	fi
EOM

# NATIVESCRIPT: source ~/.bashrc
# NATIVESCRIPT: tns error-reporting disable
# NATIVESCRIPT: tns usage-reporting disable
