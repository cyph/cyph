# Sourced by bashrc within Docker

if [ ! "${CYPH_BASHRC_INIT_COMPLETE}" ] ; then


export GIT_EDITOR='vim'
export GOPATH='/home/gibson/go'
export ANDROID_HOME='/home/gibson/androidsdk'
export JAVA_HOME="$(
	update-alternatives --query javac | sed -n -e "s/Best: *\(.*\)\/bin\/javac/\1/p"
)"
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=$(which chromium)

export PATH="$(
	echo -n '/opt/local/bin:' ;
	echo -n '/opt/local/sbin:' ;
	echo -n '/usr/local/opt/go/libexec/bin:' ;
	echo -n "/usr/lib/go-1.21/bin:" ;
	echo -n "${GOPATH}/bin:" ;
	echo -n "${ANDROID_HOME}/platform-tools:" ;
	echo -n "${ANDROID_HOME}/tools:" ;
	echo -n "${PATH}:" ;
	echo -n '/node_modules/.bin'
)"

if [ ! -f ~/.gnupg/keycache -a -d ~/.gnupg.original ] ; then
	rm -rf ~/.gnupg 2> /dev/null
	cp -a ~/.gnupg.original ~/.gnupg
fi
export GPG_TTY="$(tty)"
eval $(gpg-agent --daemon 2> /dev/null) &> /dev/null

eval $(ssh-agent 2> /dev/null) &> /dev/null

git config --global --add safe.directory /cyph

export GOOGLE_APPLICATION_CREDENTIALS="${HOME}/.cyph/gcloud-credentials.json"

if [ -f ~/google-cloud-sdk/path.bash.inc ] ; then
	source ~/google-cloud-sdk/path.bash.inc
fi
if [ -f ~/google-cloud-sdk/completion.bash.inc ] ; then
	source ~/google-cloud-sdk/completion.bash.inc
fi

if [ -f ~/emsdk/emsdk_env.sh ] ; then
	source ~/emsdk/emsdk_env.sh &> /dev/null
fi


export NEWLINE=$'\n'
export NODE_OPTIONS='--max-old-space-size=12288'

bindmount () {
	if [ "${CIRCLECI}" -o ! -d /cyph ] ; then
		rm -rf "${2}" 2> /dev/null
		cp -a "${1}" "${2}"
	else
		mkdir "${2}" 2> /dev/null
		sudo mount --bind "${1}" "${2}"
	fi
}

checkfail () {
	if (( $? )) ; then
		fail "${*}"
	fi
}

checkfailretry () {
	if (( $? )) ; then
		cd $(readlink -e /proc/${PPID}/cwd)
		$(ps -o args= ${$} | head -n2 | tail -n1)
		exit $?
	fi
}

cyph-prettier () {
	/node_modules/.bin/cyph-prettier --cache-location /tmp/prettier-cache "${@}"
}

download () {
	log "Downloading: ${*}"
	curl -s --compressed --retry 50 ${1} > ${2}
}

fail () {
	if [ "${*}" ] ; then
		log "${*}\n\nFAIL"
	else
		log 'FAIL'
	fi
	exit 1
}

getBoolArg () {
	if [ "${1}" == 'on' ] ; then
		echo 'true'
	fi
}

log () {
	echo -e "\n\n\n${*} ($(date))\n"
}

notify () {
	/cyph/commands/notify.js "${@}" > /dev/null

	if [ "${1}" == '--admins' ] ; then
		shift
	fi

	log "${*}"
}

parseArgs () {
	argbash-init "${@}" - |
		argbash - |
		tr '\n' '☁' |
		perl -pe 's/.*START OF CODE GENERATED BY Argbash(.*)END OF CODE GENERATED BY Argbash.*/#$1/g' |
		tr '☁' '\n'
}

pass () {
	if [ "${*}" ] ; then
		log "${*}\n\nPASS"
	else
		log 'PASS'
	fi
	exit 0
}

sha () {
	shasum -a 512 "${@}" | awk '{print $1}'
}

unbindmount () {
	unbindmountInternal "${1}"
	rm -rf "${1}"
}

unbindmountInternal () {
	if [ ! "${CIRCLECI}" -a -d /cyph ] ; then
		sudo umount "${1}"
	fi
}

export -f bindmount
export -f checkfail
export -f checkfailretry
export -f cyph-prettier
export -f download
export -f fail
export -f getBoolArg
export -f log
export -f notify
export -f parseArgs
export -f pass
export -f sha
export -f unbindmount
export -f unbindmountInternal


export FIREBASE_CONFIG='{}'


# Setup for documentation generation
if [ -d /cyph ] ; then
	cp -f /cyph/LICENSE /cyph/README.md /cyph/cyph.app/
	echo -e '\n---\n' >> /cyph/cyph.app/README.md
	cat /cyph/PATENTS >> /cyph/cyph.app/README.md
fi


# Workaround for localhost not working in CircleCI
if [ "${CIRCLECI}" ] ; then
	sed -i 's|localhost|0.0.0.0|g' /cyph/commands/serve.sh /cyph/*/protractor.conf.js
fi


export CYPH_BASHRC_INIT_COMPLETE=true
fi
