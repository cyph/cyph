# Sourced by bashrc within Docker

checkfail () {
	if (( $? )) ; then
		fail "${*}"
	fi
}

fail () {
	if [ "${*}" ] ; then
		log "${*}\n\nFAIL"
	else
		log 'FAIL'
	fi
	exit 1
}

log () {
	echo -e "\n\n\n${*} ($(date))\n"
}

notify () {
	/node_modules/.bin/notify --text "${*}" > /dev/null
	log "${*}"
}

pass () {
	log 'PASS'
	exit 0
}

export -f checkfail
export -f fail
export -f log
export -f notify
export -f pass


if [ -f ~/.cyph/notify.key ] ; then
	rm ~/.notifyreg 2> /dev/null
	/node_modules/.bin/notify -r "$(cat ~/.cyph/notify.key)" > /dev/null
fi
