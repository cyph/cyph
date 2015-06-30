#!/bin/bash

# WebSign HPKP re-key script, for denying availability after the first use

apikey='ASK RYAN FOR THIS'
order='ASK RYAN FOR THIS'
conf='dXNlciB3d3ctZGF0YTsKd29ya2VyX3Byb2Nlc3NlcyBhdXRvOwpwaWQgL3J1bi9uZ2lueC5waWQ7CgpldmVudHMgewoJd29ya2VyX2Nvbm5lY3Rpb25zIDc2ODsKCW11bHRpX2FjY2VwdCBvZmY7Cn0KCmh0dHAgewoKCSMjCgkjIEJhc2ljIFNldHRpbmdzCgkjIwoKCXNlbmRmaWxlIG9uOwoJdGNwX25vcHVzaCBvbjsKCXRjcF9ub2RlbGF5IG9uOwoJa2VlcGFsaXZlX3RpbWVvdXQgNjU7Cgl0eXBlc19oYXNoX21heF9zaXplIDIwNDg7CglzZXJ2ZXJfdG9rZW5zIG9mZjsKCXNlcnZlcl9uYW1lc19oYXNoX2J1Y2tldF9zaXplIDY0OwoJaW5jbHVkZSAvZXRjL25naW54L21pbWUudHlwZXM7CglkZWZhdWx0X3R5cGUgYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtOwoKCSMjCgkjIExvZ2dpbmcgU2V0dGluZ3MKCSMjCgoJYWNjZXNzX2xvZyBvZmY7CgllcnJvcl9sb2cgL2Rldi9udWxsIGNyaXQ7CgoJIyMKCSMgR3ppcCBTZXR0aW5ncwoJIyMKCglnemlwIG9uOwoJZ3ppcF9odHRwX3ZlcnNpb24gMS4wOwoJZ3ppcF9zdGF0aWMgYWx3YXlzOwoKCSMjCgkjIFNlcnZlciBTZXR0aW5ncwoJIyMKCglzZXJ2ZXIgewoJCWxpc3RlbiA0NDMgc3NsOwoKCQlzc2xfY2VydGlmaWNhdGUgc3NsL2NlcnQucGVtOwoJCXNzbF9jZXJ0aWZpY2F0ZV9rZXkgc3NsL2tleS5wZW07CgkJc3NsX2RocGFyYW0gc3NsL2RocGFyYW1zLnBlbTsKCgkJc3NsX3Nlc3Npb25fdGltZW91dCAxZDsKCQlzc2xfc2Vzc2lvbl9jYWNoZSBzaGFyZWQ6U1NMOjUwbTsKCgkJc3NsX3ByZWZlcl9zZXJ2ZXJfY2lwaGVycyBvbjsKCQlhZGRfaGVhZGVyIFB1YmxpYy1LZXktUGlucyAnbWF4LWFnZT0zMTUzNjAwMDsgaW5jbHVkZVN1YmRvbWFpbnM7IHBpbi1zaGEyNTY9IktFWV9IQVNIIjsgcGluLXNoYTI1Nj0iQU1SVDY3aE4xS1BJK3U3QXc5SnBabHp5UmFLZU8rNnUySCtqdE9tV1Z5OD0iJzsKCQlhZGRfaGVhZGVyIFN0cmljdC1UcmFuc3BvcnQtU2VjdXJpdHkgJ21heC1hZ2U9MzE1MzYwMDA7IGluY2x1ZGVTdWJkb21haW5zJzsKCQlzc2xfcHJvdG9jb2xzIFRMU3YxIFRMU3YxLjEgVExTdjEuMjsKCQlzc2xfY2lwaGVycyAnRUNESEUtUlNBLUFFUzEyOC1HQ00tU0hBMjU2OkVDREhFLUVDRFNBLUFFUzEyOC1HQ00tU0hBMjU2OkVDREhFLVJTQS1BRVMyNTYtR0NNLVNIQTM4NDpFQ0RIRS1FQ0RTQS1BRVMyNTYtR0NNLVNIQTM4NDpESEUtUlNBLUFFUzEyOC1HQ00tU0hBMjU2OkRIRS1EU1MtQUVTMTI4LUdDTS1TSEEyNTY6a0VESCtBRVNHQ006RUNESEUtUlNBLUFFUzEyOC1TSEEyNTY6RUNESEUtRUNEU0EtQUVTMTI4LVNIQTI1NjpFQ0RIRS1SU0EtQUVTMTI4LVNIQTpFQ0RIRS1FQ0RTQS1BRVMxMjgtU0hBOkVDREhFLVJTQS1BRVMyNTYtU0hBMzg0OkVDREhFLUVDRFNBLUFFUzI1Ni1TSEEzODQ6RUNESEUtUlNBLUFFUzI1Ni1TSEE6RUNESEUtRUNEU0EtQUVTMjU2LVNIQTpESEUtUlNBLUFFUzEyOC1TSEEyNTY6REhFLVJTQS1BRVMxMjgtU0hBOkRIRS1EU1MtQUVTMTI4LVNIQTI1NjpESEUtUlNBLUFFUzI1Ni1TSEEyNTY6REhFLURTUy1BRVMyNTYtU0hBOkRIRS1SU0EtQUVTMjU2LVNIQTohYU5VTEw6IWVOVUxMOiFFWFBPUlQ6IURFUzohUkM0OiEzREVTOiFNRDU6IVBTSyc7CgoJCXNzbF9zdGFwbGluZyBvbjsKCQlzc2xfc3RhcGxpbmdfdmVyaWZ5IG9uOwoJfQoKCXNlcnZlciB7CgkJbGlzdGVuIDQ0MyBzc2w7CgkJc2VydmVyX25hbWUgd3d3LmN5cGguaW07CgoJCWxvY2F0aW9uIC8gewoJCQlyZXdyaXRlIC8oLiopIC8kMSBicmVhazsKCQkJcHJveHlfcGFzcyBodHRwczovL3Byb2QtZG90LWN5cGgtaW0tZG90LWN5cGhtZS5hcHBzcG90LmNvbS87CgkJfQoJfQoJc2VydmVyIHsKCQlsaXN0ZW4gNDQzIHNzbDsKCQlzZXJ2ZXJfbmFtZSB3d3cuY3lwaC5pbzsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC1pby1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA0NDMgc3NsOwoJCXNlcnZlcl9uYW1lIHd3dy5jeXBoLm1lOwoKCQlsb2NhdGlvbiAvIHsKCQkJcmV3cml0ZSAvKC4qKSAvJDEgYnJlYWs7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9wcm9kLWRvdC1jeXBoLW1lLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCX0KCXNlcnZlciB7CgkJbGlzdGVuIDQ0MyBzc2w7CgkJc2VydmVyX25hbWUgd3d3LmN5cGgudmlkZW87CgoJCWxvY2F0aW9uIC8gewoJCQlyZXdyaXRlIC8oLiopIC8kMSBicmVhazsKCQkJcHJveHlfcGFzcyBodHRwczovL3Byb2QtZG90LWN5cGgtdmlkZW8tZG90LWN5cGhtZS5hcHBzcG90LmNvbS87CgkJfQoJfQoKCXNlcnZlciB7CgkJbGlzdGVuIDgwOwoJCXNlcnZlcl9uYW1lIGN5cGguaW0gd3d3LmN5cGguaW07CgkJcmV0dXJuIDMwMSBodHRwczovL3d3dy5jeXBoLmltJHJlcXVlc3RfdXJpOwoJfQoJc2VydmVyIHsKCQlsaXN0ZW4gODA7CgkJc2VydmVyX25hbWUgY3lwaC5pbyB3d3cuY3lwaC5pbzsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vd3d3LmN5cGguaW8kcmVxdWVzdF91cmk7Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA4MDsKCQlzZXJ2ZXJfbmFtZSBjeXBoLm1lIHd3dy5jeXBoLm1lOwoJCXJldHVybiAzMDEgaHR0cHM6Ly93d3cuY3lwaC5tZSRyZXF1ZXN0X3VyaTsKCX0KCXNlcnZlciB7CgkJbGlzdGVuIDgwOwoJCXNlcnZlcl9uYW1lIGN5cGgudmlkZW8gd3d3LmN5cGgudmlkZW87CgkJcmV0dXJuIDMwMSBodHRwczovL3d3dy5jeXBoLnZpZGVvJHJlcXVlc3RfdXJpOwoJfQp9Cg=='

function delete {
	for i in {1..10} ; do
		dd if=/dev/urandom of="${1}" bs=1024 count="$(du -k "${1}" | cut -f1)"
	done

	rm "${1}"
}


mkdir -p /tmp/websignhpkprekey
cd /tmp/websignhpkprekey

openssl dhparam -out dhparams.pem 2048
openssl req -new -newkey rsa:2048 -nodes -out csr.pem -keyout key.pem -subj '/C=US/ST=Delaware/L=Dover/O=Cyph, Inc./CN=www.cyph.com'

curl -s -u "${apikey}" -X POST \
	-H 'X-HTTP-Method-Override: REISSUE' \
	-H 'Content-Type: application/vnd.digicert.rest-v1+json' \
	--data "$(nodejs -e 'console.log(JSON.stringify({csr: require("fs").readFileSync("csr.pem").toString().trim()}))')" \
	"https://api.digicert.com/order/${order}"

delete csr.pem

sleep 5m

nodejs -e "
	var o = JSON.parse(
		'$(curl -s -u "${apikey}" "https://api.digicert.com/order/${order}/certificate")'.
			replace(/\\r/g, '').
			replace(/\\n/g, '\\\\n')
	);

	console.log(Object.keys(o.certs).map(function (k) { return o.certs[k] }).join(''));
" > cert.pem


# Validate cert against key

certHash="$(openssl x509 -in cert.pem -pubkey -noout | openssl rsa -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64)"
keyHash="$(openssl rsa -in key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"

if [ "${certHash}" == "${keyHash}" ] ; then
	service nginx stop

	delete /etc/nginx/ssl/cert.pem
	delete /etc/nginx/ssl/key.pem
	delete /etc/nginx/ssl/dhparams.pem
	delete /etc/nginx/nginx.conf

	mv cert.pem /etc/nginx/ssl/cert.pem
	mv key.pem /etc/nginx/ssl/key.pem
	mv dhparams.pem /etc/nginx/ssl/dhparams.pem

	echo "${conf}" | \
		base64 --decode | \
		sed "s|worker_connections 768;|worker_connections $(ulimit -n);|g" | \
		sed "s|KEY_HASH|${keyHash}|g" \
	> /etc/nginx/nginx.conf

	service nginx start
else
	delete cert.pem
	delete key.pem
	delete dhparams.pem
fi
