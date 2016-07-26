#!/bin/bash

# WebSign HPKP re-key script, for denying availability after the first use

apikey='ASK RYAN FOR THIS'
order='ASK RYAN FOR THIS'
conf='dXNlciB3d3ctZGF0YTsKd29ya2VyX3Byb2Nlc3NlcyBhdXRvOwpwaWQgL3J1bi9uZ2lueC5waWQ7CgpldmVudHMgewoJd29ya2VyX2Nvbm5lY3Rpb25zIDc2ODsKCW11bHRpX2FjY2VwdCBvZmY7Cn0KCmh0dHAgewoKCSMjCgkjIEJhc2ljIFNldHRpbmdzCgkjIwoKCXNlbmRmaWxlIG9uOwoJdGNwX25vcHVzaCBvbjsKCXRjcF9ub2RlbGF5IG9uOwoJa2VlcGFsaXZlX3RpbWVvdXQgNjU7Cgl0eXBlc19oYXNoX21heF9zaXplIDIwNDg7CglzZXJ2ZXJfdG9rZW5zIG9mZjsKCXNlcnZlcl9uYW1lc19oYXNoX2J1Y2tldF9zaXplIDY0OwoJaW5jbHVkZSAvZXRjL25naW54L21pbWUudHlwZXM7CglkZWZhdWx0X3R5cGUgYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtOwoKCSMjCgkjIExvZ2dpbmcgU2V0dGluZ3MKCSMjCgoJYWNjZXNzX2xvZyBvZmY7CgllcnJvcl9sb2cgL2Rldi9udWxsIGNyaXQ7CgoJIyMKCSMgR3ppcCBTZXR0aW5ncwoJIyMKCglnemlwIG9uOwoJZ3ppcF9odHRwX3ZlcnNpb24gMS4wOwoJZ3ppcF9zdGF0aWMgYWx3YXlzOwoKCSMjCgkjIFNlcnZlciBTZXR0aW5ncwoJIyMKCglzZXJ2ZXIgewoJCVNTTF9DT05GSUcKCQlzZXJ2ZXJfbmFtZSBjeXBoLmltIHd3dy5jeXBoLmltOwoKCQlsb2NhdGlvbiAvIHsKCQkJcmV3cml0ZSAvKC4qKSAvJDEgYnJlYWs7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9wcm9kLWRvdC1jeXBoLWltLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCX0KCXNlcnZlciB7CgkJU1NMX0NPTkZJRwoJCXNlcnZlcl9uYW1lIGN5cGguaW8gd3d3LmN5cGguaW87CgoJCWxvY2F0aW9uIC8gewoJCQlyZXdyaXRlIC8oLiopIC8kMSBicmVhazsKCQkJcHJveHlfcGFzcyBodHRwczovL3Byb2QtZG90LWN5cGgtaW8tZG90LWN5cGhtZS5hcHBzcG90LmNvbS87CgkJfQoJfQoJc2VydmVyIHsKCQlTU0xfQ09ORklHCgkJc2VydmVyX25hbWUgY3lwaC5tZSB3d3cuY3lwaC5tZTsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC1tZS1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9Cgl9CglzZXJ2ZXIgewoJCVNTTF9DT05GSUcKCQlzZXJ2ZXJfbmFtZSBjeXBoLnZpZGVvIHd3dy5jeXBoLnZpZGVvOwoKCQlsb2NhdGlvbiAvIHsKCQkJcmV3cml0ZSAvKC4qKSAvJDEgYnJlYWs7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9wcm9kLWRvdC1jeXBoLXZpZGVvLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCX0KCXNlcnZlciB7CgkJU1NMX0NPTkZJRwoJCXNlcnZlcl9uYW1lIGN5cGguYXVkaW8gd3d3LmN5cGguYXVkaW87CgoJCWxvY2F0aW9uIC8gewoJCQlyZXdyaXRlIC8oLiopIC8kMSBicmVhazsKCQkJcHJveHlfcGFzcyBodHRwczovL3Byb2QtZG90LWN5cGgtYXVkaW8tZG90LWN5cGhtZS5hcHBzcG90LmNvbS87CgkJfQoJfQoKCXNlcnZlciB7CgkJbGlzdGVuIDgwOwoJCXNlcnZlcl9uYW1lIGN5cGguaW0gd3d3LmN5cGguaW07CgkJcmV0dXJuIDMwMSBodHRwczovL2N5cGguaW0kcmVxdWVzdF91cmk7Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA4MDsKCQlzZXJ2ZXJfbmFtZSBjeXBoLmlvIHd3dy5jeXBoLmlvOwoJCXJldHVybiAzMDEgaHR0cHM6Ly9jeXBoLmlvJHJlcXVlc3RfdXJpOwoJfQoJc2VydmVyIHsKCQlsaXN0ZW4gODA7CgkJc2VydmVyX25hbWUgY3lwaC5tZSB3d3cuY3lwaC5tZTsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vY3lwaC5tZSRyZXF1ZXN0X3VyaTsKCX0KCXNlcnZlciB7CgkJbGlzdGVuIDgwOwoJCXNlcnZlcl9uYW1lIGN5cGgudmlkZW8gd3d3LmN5cGgudmlkZW87CgkJcmV0dXJuIDMwMSBodHRwczovL2N5cGgudmlkZW8kcmVxdWVzdF91cmk7Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA4MDsKCQlzZXJ2ZXJfbmFtZSBjeXBoLmF1ZGlvIHd3dy5jeXBoLmF1ZGlvOwoJCXJldHVybiAzMDEgaHR0cHM6Ly9jeXBoLmF1ZGlvJHJlcXVlc3RfdXJpOwoJfQp9Cg=='
sslconf='bGlzdGVuIDQ0MyBzc2wgaHR0cDI7Cmxpc3RlbiBbOjpdOjQ0MyBzc2wgaHR0cDI7Cgpzc2xfY2VydGlmaWNhdGUgc3NsL2NlcnQucGVtOwpzc2xfY2VydGlmaWNhdGVfa2V5IHNzbC9rZXkucGVtOwpzc2xfZGhwYXJhbSBzc2wvZGhwYXJhbXMucGVtOwoKc3NsX3Nlc3Npb25fdGltZW91dCAxZDsKc3NsX3Nlc3Npb25fY2FjaGUgc2hhcmVkOlNTTDo1MG07CnNzbF9zZXNzaW9uX3RpY2tldHMgb2ZmOwoKc3NsX3Byb3RvY29scyBUTFN2MSBUTFN2MS4xIFRMU3YxLjI7CnNzbF9jaXBoZXJzICdFQ0RIRS1FQ0RTQS1DSEFDSEEyMC1QT0xZMTMwNTpFQ0RIRS1SU0EtQ0hBQ0hBMjAtUE9MWTEzMDU6RUNESEUtRUNEU0EtQUVTMTI4LUdDTS1TSEEyNTY6RUNESEUtUlNBLUFFUzEyOC1HQ00tU0hBMjU2OkVDREhFLUVDRFNBLUFFUzI1Ni1HQ00tU0hBMzg0OkVDREhFLVJTQS1BRVMyNTYtR0NNLVNIQTM4NDpESEUtUlNBLUFFUzEyOC1HQ00tU0hBMjU2OkRIRS1SU0EtQUVTMjU2LUdDTS1TSEEzODQ6RUNESEUtRUNEU0EtQUVTMTI4LVNIQTI1NjpFQ0RIRS1SU0EtQUVTMTI4LVNIQTI1NjpFQ0RIRS1FQ0RTQS1BRVMxMjgtU0hBOkVDREhFLVJTQS1BRVMyNTYtU0hBMzg0OkVDREhFLVJTQS1BRVMxMjgtU0hBOkVDREhFLUVDRFNBLUFFUzI1Ni1TSEEzODQ6RUNESEUtRUNEU0EtQUVTMjU2LVNIQTpFQ0RIRS1SU0EtQUVTMjU2LVNIQTpESEUtUlNBLUFFUzEyOC1TSEEyNTY6REhFLVJTQS1BRVMxMjgtU0hBOkRIRS1SU0EtQUVTMjU2LVNIQTI1NjpESEUtUlNBLUFFUzI1Ni1TSEE6RUNESEUtRUNEU0EtREVTLUNCQzMtU0hBOkVDREhFLVJTQS1ERVMtQ0JDMy1TSEE6RURILVJTQS1ERVMtQ0JDMy1TSEE6QUVTMTI4LUdDTS1TSEEyNTY6QUVTMjU2LUdDTS1TSEEzODQ6QUVTMTI4LVNIQTI1NjpBRVMyNTYtU0hBMjU2OkFFUzEyOC1TSEE6QUVTMjU2LVNIQTpERVMtQ0JDMy1TSEE6IURTUyc7CnNzbF9wcmVmZXJfc2VydmVyX2NpcGhlcnMgb247CgphZGRfaGVhZGVyIFB1YmxpYy1LZXktUGlucyAnbWF4LWFnZT01MTg0MDAwOyBpbmNsdWRlU3ViZG9tYWluczsgcGluLXNoYTI1Nj0iS0VZX0hBU0giOyBwaW4tc2hhMjU2PSJCQUNLVVBfSEFTSCInOwphZGRfaGVhZGVyIFN0cmljdC1UcmFuc3BvcnQtU2VjdXJpdHkgJ21heC1hZ2U9MzE1MzYwMDA7IGluY2x1ZGVTdWJkb21haW5zOyBwcmVsb2FkJzsKCnNzbF9zdGFwbGluZyBvbjsKc3NsX3N0YXBsaW5nX3ZlcmlmeSBvbjs='

function delete {
	for i in {1..10} ; do
		dd if=/dev/urandom of="${1}" bs=1024 count="$(du -k "${1}" | cut -f1)"
	done

	rm "${1}"
}


mkdir -p /etc/nginx/ssl/tmp
cd /etc/nginx/ssl/tmp

openssl dhparam -out dhparams.pem 4096
openssl genrsa -out backup.pem 4096
openssl req -new -newkey rsa:4096 -nodes -out csr.pem -keyout key.pem -subj '/C=US/ST=Delaware/L=Dover/O=Cyph, Inc./CN=cyph.im'

curl -s -u "${apikey}" -X POST \
	-H 'X-HTTP-Method-Override: REISSUE' \
	-H 'Content-Type: application/vnd.digicert.rest-v1+json' \
	--data "$(node -e 'console.log(JSON.stringify({csr: require("fs").readFileSync("csr.pem").toString().trim()}))')" \
	"https://api.digicert.com/order/${order}"

delete csr.pem

sleep 1m

node -e "
	var o = JSON.parse(
		'$(curl -s -u "${apikey}" "https://api.digicert.com/order/${order}/certificate")'.
			replace(/\\r/g, '').
			replace(/\\n/g, '\\\\n')
	);

	console.log(Object.keys(o.certs).map(k => o.certs[k]).join(''));
" > cert.pem


# Validate cert against key

certHash="$(openssl x509 -in cert.pem -pubkey -noout | openssl rsa -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64)"
keyHash="$(openssl rsa -in key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"
backupHash="$(openssl rsa -in backup.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"

delete backup.pem

if [ "${certHash}" == "${keyHash}" ] ; then
	service nginx stop
	sleep 1
	killall nginx

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
		sed "s/SSL_CONFIG/$( \
			echo "${sslconf}" | \
			base64 --decode | \
			perl -pe 's/\//\\\//g' | \
			perl -pe 's/\n/\\n/g' \
		)/g" | \
		sed "s|KEY_HASH|${keyHash}|g" | \
		sed "s|BACKUP_HASH|${backupHash}|g" \
	> /etc/nginx/nginx.conf

	sleep 1
	service nginx start
	sleep 1
	service nginx restart
else
	delete cert.pem
	delete key.pem
	delete dhparams.pem
fi


days="$(node -e 'console.log(Math.floor(new Uint32Array(new Uint8Array(crypto.randomBytes(4)).buffer)[0] / 4294967296 * 7) + 1)')"
sleep ${days}d
/rekey.sh &
