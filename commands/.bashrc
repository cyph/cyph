# Sourced by bashrc within Docker

bindmount () {
	if [ "${CIRCLECI}" ] ; then
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

download () {
	log "Downloading: ${*}"
	curl -s --compressed --retry 50 ${1} > ${2}
}

easyoptions () {
	source ~/easyoptions/easyoptions
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

# Workaround for https://github.com/angular/angular-cli/issues/10529
ng () {
	node --max_old_space_size=8000 ./node_modules/@angular/cli/bin/ng "${@}"
}

notify () {
	/node_modules/.bin/notify --text "${*}" > /dev/null
	log "${*}"
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
	if [ ! "${CIRCLECI}" ] ; then
		sudo umount "${1}"
	fi
}

export -f bindmount
export -f checkfail
export -f download
export -f easyoptions
export -f fail
export -f log
export -f ng
export -f notify
export -f pass
export -f sha
export -f unbindmount
export -f unbindmountInternal


export FIREBASE_CONFIG='{}'

if [ -f ~/.cyph/notify.key ] && [ -f /node_modules/.bin/notify ] ; then
	rm ~/.notifyreg 2> /dev/null
	/node_modules/.bin/notify -r "$(cat ~/.cyph/notify.key)" > /dev/null
fi


# Setup for documentation generation
cp -f /cyph/LICENSE /cyph/README.md /cyph/cyph.app/
echo -e '\n---\n' >> /cyph/cyph.app/README.md
cat /cyph/PATENTS >> /cyph/cyph.app/README.md


# Workaround for localhost not working in CircleCI
if [ "${CIRCLECI}" ] ; then
	sed -i 's|localhost|0.0.0.0|g' /cyph/commands/serve.sh /cyph/*/protractor.conf.js
fi

# Apply https://github.com/angular/angular/pull/33403
if [ ! -f /node_modules/@angular/compiler/bundles/compiler.umd.js.patched ] ; then
	echo 'NzUwYTc1MQo+ICAgICAgICAgICAgIHRoaXMuX3NlbGVjdG9ySW5kZXhNYXAgPSBuZXcgTWFwKCk7Cjc3OGE3ODAsNzgxCj4gICAgICAgICAgICAgdGhpcy5fc2VsZWN0b3JJbmRleE1hcC5zZXQoY3NzU2VsZWN0b3IsIHRoaXMuX3NlbGVjdG9ySW5kZXhNYXAuc2l6ZSk7Cj4gCjg1Nyw4NThjODYwLDg2NQo8ICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuX21hdGNoVGVybWluYWwodGhpcy5fZWxlbWVudE1hcCwgZWxlbWVudCwgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHwgcmVzdWx0Owo8ICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuX21hdGNoUGFydGlhbCh0aGlzLl9lbGVtZW50UGFydGlhbE1hcCwgZWxlbWVudCwgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHwKLS0tCj4gCj4gICAgICAgICAgICAgdmFyIHNlbGVjdG9yTWF0Y2hDYWxsYmFjayA9IG1hdGNoZWRDYWxsYmFjayAhPSBudWxsID8gKGMsIGEpID0+IHsKPiAgICAgICAgICAgICAgICAgbWF0Y2hlZENhbGxiYWNrKGMsIGEsIHRoaXMuX3NlbGVjdG9ySW5kZXhNYXAuZ2V0KGMpKTsKPiAgICAgICAgICAgICB9IDogbnVsbDsKPiAKPiAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLl9tYXRjaFRlcm1pbmFsKHRoaXMuX2VsZW1lbnRNYXAsIGVsZW1lbnQsIGNzc1NlbGVjdG9yLCBzZWxlY3Rvck1hdGNoQ2FsbGJhY2spIHx8Cjg1OWE4NjcsODcwCj4gICAgICAgICAgICAgcmVzdWx0ID0KPiAgICAgICAgICAgICB0aGlzLl9tYXRjaFBhcnRpYWwodGhpcy5fZWxlbWVudFBhcnRpYWxNYXAsIGVsZW1lbnQsIGNzc1NlbGVjdG9yLCBzZWxlY3Rvck1hdGNoQ2FsbGJhY2spIHx8Cj4gICAgICAgICAgICAgcmVzdWx0Owo+IAo4NjQsODY2Yzg3NSw4NzgKPCAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXRjaFRlcm1pbmFsKHRoaXMuX2NsYXNzTWFwLCBjbGFzc05hbWUsIGNzc1NlbGVjdG9yLCBtYXRjaGVkQ2FsbGJhY2spIHx8IHJlc3VsdDsKPCAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9CjwgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWF0Y2hQYXJ0aWFsKHRoaXMuX2NsYXNzUGFydGlhbE1hcCwgY2xhc3NOYW1lLCBjc3NTZWxlY3RvciwgbWF0Y2hlZENhbGxiYWNrKSB8fAotLS0KPiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXRjaFRlcm1pbmFsKHRoaXMuX2NsYXNzTWFwLCBjbGFzc05hbWUsIGNzc1NlbGVjdG9yLCBzZWxlY3Rvck1hdGNoQ2FsbGJhY2spIHx8Cj4gICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0Owo+ICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5fbWF0Y2hQYXJ0aWFsKAo+ICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2NsYXNzUGFydGlhbE1hcCwgY2xhc3NOYW1lLCBjc3NTZWxlY3Rvciwgc2VsZWN0b3JNYXRjaENhbGxiYWNrKSB8fAo4NzdjODg5CjwgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX21hdGNoVGVybWluYWwodGVybWluYWxWYWx1ZXNNYXAsICcnLCBjc3NTZWxlY3RvciwgbWF0Y2hlZENhbGxiYWNrKSB8fCByZXN1bHQ7Ci0tLQo+ICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXRjaFRlcm1pbmFsKHRlcm1pbmFsVmFsdWVzTWFwLCAnJywgY3NzU2VsZWN0b3IsIHNlbGVjdG9yTWF0Y2hDYWxsYmFjaykgfHwgcmVzdWx0Owo4ODBjODkyCjwgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWF0Y2hUZXJtaW5hbCh0ZXJtaW5hbFZhbHVlc01hcCwgdmFsdWUsIGNzc1NlbGVjdG9yLCBtYXRjaGVkQ2FsbGJhY2spIHx8IHJlc3VsdDsKLS0tCj4gICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbWF0Y2hUZXJtaW5hbCh0ZXJtaW5hbFZhbHVlc01hcCwgdmFsdWUsIGNzc1NlbGVjdG9yLCBzZWxlY3Rvck1hdGNoQ2FsbGJhY2spIHx8IHJlc3VsdDsKODgzYzg5NQo8ICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMuX21hdGNoUGFydGlhbChwYXJ0aWFsVmFsdWVzTWFwLCAnJywgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHwgcmVzdWx0OwotLS0KPiAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLl9tYXRjaFBhcnRpYWwocGFydGlhbFZhbHVlc01hcCwgJycsIGNzc1NlbGVjdG9yLCBzZWxlY3Rvck1hdGNoQ2FsbGJhY2spIHx8IHJlc3VsdDsKODg2Yzg5OAo8ICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX21hdGNoUGFydGlhbChwYXJ0aWFsVmFsdWVzTWFwLCB2YWx1ZSwgY3NzU2VsZWN0b3IsIG1hdGNoZWRDYWxsYmFjaykgfHwgcmVzdWx0OwotLS0KPiAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9tYXRjaFBhcnRpYWwocGFydGlhbFZhbHVlc01hcCwgdmFsdWUsIGNzc1NlbGVjdG9yLCBzZWxlY3Rvck1hdGNoQ2FsbGJhY2spIHx8IHJlc3VsdDsKMTY2NzhhMTY2OTEsMTY2OTIKPiAgICAgICAgICAgICAvLyBNYXRjaGVkIGRpcmVjdGl2ZXMgaW4gdGVtcGxhdGUgdGhhdCBuZWVkIHRvIGJlIHNvcnRlZCBieSBpbmRleAo+ICAgICAgICAgICAgIHRoaXMuX2RpcmVjdGl2ZXNXaXRoSW5kZXggPSBbXTsKMTY3NjZhMTY3ODEsMTY3ODYKPiAKPiAgICAgICAgICAgICB0aGlzLl9kaXJlY3RpdmVzV2l0aEluZGV4LnNvcnQoKHQxLCB0MikgPT4gdDFbMV0gLSB0MlsxXSk7Cj4gICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9kaXJlY3RpdmVzV2l0aEluZGV4Lmxlbmd0aDsgaSsrKSB7Cj4gICAgICAgICAgICAgICAgIHRoaXMuZGlyZWN0aXZlcy5hZGQodGhpcy5fZGlyZWN0aXZlc1dpdGhJbmRleFtpXVswXSk7Cj4gICAgICAgICAgICAgfQo+IAoxNzU1MGMxNzU3MAo8ICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZU1hdGNoZXIubWF0Y2goc2VsZWN0b3IsIGZ1bmN0aW9uIChjc3NTZWxlY3Rvciwgc3RhdGljVHlwZSkgeyBfdGhpcy5kaXJlY3RpdmVzLmFkZChzdGF0aWNUeXBlKTsgfSk7Ci0tLQo+ICAgICAgICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZU1hdGNoZXIubWF0Y2goc2VsZWN0b3IsIGZ1bmN0aW9uIChjc3NTZWxlY3Rvciwgc3RhdGljVHlwZSwgaW5kZXgpIHsgX3RoaXMuX2RpcmVjdGl2ZXNXaXRoSW5kZXgucHVzaChbc3RhdGljVHlwZSwgaW5kZXhdKTsgfSk7Cg==' |
		base64 --decode |
		patch /node_modules/@angular/compiler/bundles/compiler.umd.js

	touch /node_modules/@angular/compiler/bundles/compiler.umd.js.patched
fi
