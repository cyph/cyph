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

pass () {
	log 'PASS'
	exit 0
}

export -f checkfail
export -f fail
export -f log
export -f pass
