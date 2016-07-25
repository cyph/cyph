#!/bin/bash

# WebSign HPKP re-key script, for denying availability after the first use

apikey='ASK RYAN FOR THIS'
order='ASK RYAN FOR THIS'
conf='dXNlciB3d3ctZGF0YTsKd29ya2VyX3Byb2Nlc3NlcyBhdXRvOwpwaWQgL3J1bi9uZ2lueC5waWQ7CgpldmVudHMgewoJd29ya2VyX2Nvbm5lY3Rpb25zIDc2ODsKCW11bHRpX2FjY2VwdCBvZmY7Cn0KCmh0dHAgewoKCSMjCgkjIEJhc2ljIFNldHRpbmdzCgkjIwoKCXNlbmRmaWxlIG9uOwoJdGNwX25vcHVzaCBvbjsKCXRjcF9ub2RlbGF5IG9uOwoJa2VlcGFsaXZlX3RpbWVvdXQgNjU7Cgl0eXBlc19oYXNoX21heF9zaXplIDIwNDg7CglzZXJ2ZXJfdG9rZW5zIG9mZjsKCXNlcnZlcl9uYW1lc19oYXNoX2J1Y2tldF9zaXplIDY0OwoJaW5jbHVkZSAvZXRjL25naW54L21pbWUudHlwZXM7CglkZWZhdWx0X3R5cGUgYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtOwoKCSMjCgkjIExvZ2dpbmcgU2V0dGluZ3MKCSMjCgoJYWNjZXNzX2xvZyBvZmY7CgllcnJvcl9sb2cgL2Rldi9udWxsIGNyaXQ7CgoJIyMKCSMgR3ppcCBTZXR0aW5ncwoJIyMKCglnemlwIG9uOwoJZ3ppcF9odHRwX3ZlcnNpb24gMS4wOwoJZ3ppcF9zdGF0aWMgYWx3YXlzOwoKCSMjCgkjIFNlcnZlciBTZXR0aW5ncwoJIyMKCglwcm94eV9jYWNoZV9wYXRoIC9kYXRhL25naW54L2NhY2hlIGxldmVscz0xOjIga2V5c196b25lPWNkbjo1MG0gbWF4X3NpemU9NWcgaW5hY3RpdmU9MjRoOwoKCSMgU3RhbmRhcmQgaG9zdG5hbWVzCgoJc2VydmVyIHsKCQlTU0xfQ09ORklHCgkJc2VydmVyX25hbWUgY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vd3d3LmN5cGhkYnloaWRkZW5iaHMub25pb24kcmVxdWVzdF91cmk7Cgl9CglzZXJ2ZXIgewoJCVNTTF9DT05GSUcKCQlzZXJ2ZXJfbmFtZSB3d3cuY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC1jb20tZG90LWN5cGhtZS5hcHBzcG90LmNvbS87CgkJCXByb3h5X2hpZGVfaGVhZGVyIFB1YmxpYy1LZXktUGluczsKCQkJcHJveHlfaGlkZV9oZWFkZXIgU3RyaWN0LVRyYW5zcG9ydC1TZWN1cml0eTsKCQl9Cgl9CglzZXJ2ZXIgewoJCVNTTF9DT05GSUcKCQlzZXJ2ZXJfbmFtZSBhcGkuY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtZGVmYXVsdC1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQkJcHJveHlfaGlkZV9oZWFkZXIgUHVibGljLUtleS1QaW5zOwoJCQlwcm94eV9oaWRlX2hlYWRlciBTdHJpY3QtVHJhbnNwb3J0LVNlY3VyaXR5OwoJCX0KCX0KCXNlcnZlciB7CgkJU1NMX0NPTkZJRwoJCXNlcnZlcl9uYW1lIGNkbi5jeXBoZGJ5aGlkZGVuYmhzLm9uaW9uOwoKCQlsb2NhdGlvbiAvIHsKCQkJcmV3cml0ZSAvKC4qKSAvJDEgYnJlYWs7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9ldS5jZG4uY3lwaC5jb20vOwoJCQlwcm94eV9jYWNoZSBjZG47CgkJCXByb3h5X2hpZGVfaGVhZGVyIFB1YmxpYy1LZXktUGluczsKCQkJcHJveHlfaGlkZV9oZWFkZXIgU3RyaWN0LVRyYW5zcG9ydC1TZWN1cml0eTsKCQl9Cgl9CglzZXJ2ZXIgewoJCVNTTF9DT05GSUcKCQlzZXJ2ZXJfbmFtZSBwaW5nLmN5cGhkYnloaWRkZW5iaHMub25pb247CgoJCWxvY2F0aW9uID0gLyB7CgkJCWFkZF9oZWFkZXIgQ29udGVudC1UeXBlICd0ZXh0L3BsYWluJzsKCQkJYWRkX2hlYWRlciBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4gJyonOwoJCQlhZGRfaGVhZGVyIEFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMgJ0dFVCc7CgkJCXJldHVybiAyMDAgcG9uZzsKCQl9Cgl9CgoJc2VydmVyIHsKCQlsaXN0ZW4gMTI3LjAuMC4xOjgwODA7CgkJc2VydmVyX25hbWUgY3lwaGRieWhpZGRlbmJocy5vbmlvbiB3d3cuY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vd3d3LmN5cGhkYnloaWRkZW5iaHMub25pb24kcmVxdWVzdF91cmk7Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiAxMjcuMC4wLjE6ODA4MDsKCQlzZXJ2ZXJfbmFtZSBhcGkuY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vYXBpLmN5cGhkYnloaWRkZW5iaHMub25pb24kcmVxdWVzdF91cmk7Cgl9CgkKCSMgV2ViU2lnbiBob3N0bmFtZXMKCglzZXJ2ZXIgewoJCVNTTF9DT05GSUdfV0VCU0lHTgoJCXNlcnZlcl9uYW1lIGltLmN5cGhkYnloaWRkZW5iaHMub25pb247CgoJCWxvY2F0aW9uIC8gewoJCQlyZXdyaXRlIC8oLiopIC8kMSBicmVhazsKCQkJcHJveHlfcGFzcyBodHRwczovL3Byb2QtZG90LWN5cGgtaW0tZG90LWN5cGhtZS5hcHBzcG90LmNvbS87CgkJfQoJfQoJc2VydmVyIHsKCQlTU0xfQ09ORklHX1dFQlNJR04KCQlzZXJ2ZXJfbmFtZSBpby5jeXBoZGJ5aGlkZGVuYmhzLm9uaW9uOwoKCQlsb2NhdGlvbiAvIHsKCQkJcmV3cml0ZSAvKC4qKSAvJDEgYnJlYWs7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9wcm9kLWRvdC1jeXBoLWlvLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCX0KCXNlcnZlciB7CgkJU1NMX0NPTkZJR19XRUJTSUdOCgkJc2VydmVyX25hbWUgbWUuY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC1tZS1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9Cgl9CglzZXJ2ZXIgewoJCVNTTF9DT05GSUdfV0VCU0lHTgoJCXNlcnZlcl9uYW1lIHZpZGVvLmN5cGhkYnloaWRkZW5iaHMub25pb247CgoJCWxvY2F0aW9uIC8gewoJCQlyZXdyaXRlIC8oLiopIC8kMSBicmVhazsKCQkJcHJveHlfcGFzcyBodHRwczovL3Byb2QtZG90LWN5cGgtdmlkZW8tZG90LWN5cGhtZS5hcHBzcG90LmNvbS87CgkJfQoJfQoJc2VydmVyIHsKCQlTU0xfQ09ORklHX1dFQlNJR04KCQlzZXJ2ZXJfbmFtZSBhdWRpby5jeXBoZGJ5aGlkZGVuYmhzLm9uaW9uOwoKCQlsb2NhdGlvbiAvIHsKCQkJcmV3cml0ZSAvKC4qKSAvJDEgYnJlYWs7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9wcm9kLWRvdC1jeXBoLWF1ZGlvLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCX0KCglzZXJ2ZXIgewoJCWxpc3RlbiAxMjcuMC4wLjE6ODA4MDsKCQlzZXJ2ZXJfbmFtZSBpbS5jeXBoZGJ5aGlkZGVuYmhzLm9uaW9uOwoJCXJldHVybiAzMDEgaHR0cHM6Ly9pbS5jeXBoZGJ5aGlkZGVuYmhzLm9uaW9uJHJlcXVlc3RfdXJpOwoJfQoJc2VydmVyIHsKCQlsaXN0ZW4gMTI3LjAuMC4xOjgwODA7CgkJc2VydmVyX25hbWUgaW8uY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vaW8uY3lwaGRieWhpZGRlbmJocy5vbmlvbiRyZXF1ZXN0X3VyaTsKCX0KCXNlcnZlciB7CgkJbGlzdGVuIDEyNy4wLjAuMTo4MDgwOwoJCXNlcnZlcl9uYW1lIG1lLmN5cGhkYnloaWRkZW5iaHMub25pb247CgkJcmV0dXJuIDMwMSBodHRwczovL21lLmN5cGhkYnloaWRkZW5iaHMub25pb24kcmVxdWVzdF91cmk7Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiAxMjcuMC4wLjE6ODA4MDsKCQlzZXJ2ZXJfbmFtZSB2aWRlby5jeXBoZGJ5aGlkZGVuYmhzLm9uaW9uOwoJCXJldHVybiAzMDEgaHR0cHM6Ly92aWRlby5jeXBoZGJ5aGlkZGVuYmhzLm9uaW9uJHJlcXVlc3RfdXJpOwoJfQoJc2VydmVyIHsKCQlsaXN0ZW4gMTI3LjAuMC4xOjgwODA7CgkJc2VydmVyX25hbWUgYXVkaW8uY3lwaGRieWhpZGRlbmJocy5vbmlvbjsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vYXVkaW8uY3lwaGRieWhpZGRlbmJocy5vbmlvbiRyZXF1ZXN0X3VyaTsKCX0KfQo='
sslconf='bGlzdGVuIDEyNy4wLjAuMTo4MDgxIHNzbCBodHRwMjsKCnNzbF9jZXJ0aWZpY2F0ZSBTU0xfUEFUSC9jZXJ0LnBlbTsKc3NsX2NlcnRpZmljYXRlX2tleSBTU0xfUEFUSC9rZXkucGVtOwpzc2xfZGhwYXJhbSBTU0xfUEFUSC9kaHBhcmFtcy5wZW07Cgpzc2xfc2Vzc2lvbl90aW1lb3V0IDFkOwpzc2xfc2Vzc2lvbl9jYWNoZSBzaGFyZWQ6U1NMOjUwbTsKc3NsX3Nlc3Npb25fdGlja2V0cyBvZmY7Cgpzc2xfcHJvdG9jb2xzIFRMU3YxIFRMU3YxLjEgVExTdjEuMjsKc3NsX2NpcGhlcnMgJ0VDREhFLUVDRFNBLUNIQUNIQTIwLVBPTFkxMzA1OkVDREhFLVJTQS1DSEFDSEEyMC1QT0xZMTMwNTpFQ0RIRS1FQ0RTQS1BRVMxMjgtR0NNLVNIQTI1NjpFQ0RIRS1SU0EtQUVTMTI4LUdDTS1TSEEyNTY6RUNESEUtRUNEU0EtQUVTMjU2LUdDTS1TSEEzODQ6RUNESEUtUlNBLUFFUzI1Ni1HQ00tU0hBMzg0OkRIRS1SU0EtQUVTMTI4LUdDTS1TSEEyNTY6REhFLVJTQS1BRVMyNTYtR0NNLVNIQTM4NDpFQ0RIRS1FQ0RTQS1BRVMxMjgtU0hBMjU2OkVDREhFLVJTQS1BRVMxMjgtU0hBMjU2OkVDREhFLUVDRFNBLUFFUzEyOC1TSEE6RUNESEUtUlNBLUFFUzI1Ni1TSEEzODQ6RUNESEUtUlNBLUFFUzEyOC1TSEE6RUNESEUtRUNEU0EtQUVTMjU2LVNIQTM4NDpFQ0RIRS1FQ0RTQS1BRVMyNTYtU0hBOkVDREhFLVJTQS1BRVMyNTYtU0hBOkRIRS1SU0EtQUVTMTI4LVNIQTI1NjpESEUtUlNBLUFFUzEyOC1TSEE6REhFLVJTQS1BRVMyNTYtU0hBMjU2OkRIRS1SU0EtQUVTMjU2LVNIQTpFQ0RIRS1FQ0RTQS1ERVMtQ0JDMy1TSEE6RUNESEUtUlNBLURFUy1DQkMzLVNIQTpFREgtUlNBLURFUy1DQkMzLVNIQTpBRVMxMjgtR0NNLVNIQTI1NjpBRVMyNTYtR0NNLVNIQTM4NDpBRVMxMjgtU0hBMjU2OkFFUzI1Ni1TSEEyNTY6QUVTMTI4LVNIQTpBRVMyNTYtU0hBOkRFUy1DQkMzLVNIQTohRFNTJzsKc3NsX3ByZWZlcl9zZXJ2ZXJfY2lwaGVycyBvbjsKCmFkZF9oZWFkZXIgUHVibGljLUtleS1QaW5zICdtYXgtYWdlPTUxODQwMDA7IGluY2x1ZGVTdWJkb21haW5zOyBwaW4tc2hhMjU2PSJLRVlfSEFTSCI7IHBpbi1zaGEyNTY9IkJBQ0tVUF9IQVNIIic7CmFkZF9oZWFkZXIgU3RyaWN0LVRyYW5zcG9ydC1TZWN1cml0eSAnbWF4LWFnZT0zMTUzNjAwMDsgaW5jbHVkZVN1YmRvbWFpbnM7IHByZWxvYWQnOwoKc3NsX3N0YXBsaW5nIG9uOwpzc2xfc3RhcGxpbmdfdmVyaWZ5IG9uOw=='

staticKeyHash='L8VDNR3M39gVmkDK8uGIc5Qx9Cms3fh8/hw5rWqPEbA='
staticBackupHash='qkfPaU8MSHYMoMxAH8DGToHOQJNW8NgpNvx+EtIPCbw='

function delete {
	for i in {1..10} ; do
		dd if=/dev/urandom of="${1}" bs=1024 count="$(du -k "${1}" | cut -f1)"
	done

	rm "${1}"
}


mkdir -p /etc/nginx/ssl/websign/tmp
cd /etc/nginx/ssl/websign/tmp

openssl dhparam -out dhparams.pem 4096
openssl genrsa -out backup.pem 4096
openssl req -new -newkey rsa:4096 -nodes -out csr.pem -keyout key.pem -subj '/C=US/ST=Delaware/L=Dover/O=Cyph, Inc./CN=cyphdbyhiddenbhs.onion'

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
	killall nginx
	service nginx stop

	delete /etc/nginx/ssl/websign/cert.pem
	delete /etc/nginx/ssl/websign/key.pem
	delete /etc/nginx/ssl/websign/dhparams.pem
	delete /etc/nginx/nginx.conf

	mv cert.pem /etc/nginx/ssl/websign/cert.pem
	mv key.pem /etc/nginx/ssl/websign/key.pem
	mv dhparams.pem /etc/nginx/ssl/websign/dhparams.pem

	echo "${conf}" | \
		base64 --decode | \
		sed "s|worker_connections 768;|worker_connections $(ulimit -n);|g" | \
		sed "s/SSL_CONFIG_WEBSIGN/$( \
			echo "${sslconf}" | base64 --decode | \
			sed 's|SSL_PATH|ssl/websign|g' | \
			sed "s|KEY_HASH|${keyHash}|g" | \
			sed "s|BACKUP_HASH|${backupHash}|g" | \
			perl -pe 's/\//\\\//g' | perl -pe 's/\n/\\n/g' \
		)/g" | \
		sed "s/SSL_CONFIG/$( \
			echo "${sslconf}" | base64 --decode | \
			sed 's|SSL_PATH|ssl|g' | \
			sed "s|KEY_HASH|${staticKeyHash}|g" | \
			sed "s|BACKUP_HASH|${staticBackupHash}|g" | \
			perl -pe 's/\//\\\//g' | perl -pe 's/\n/\\n/g' \
		)/g" \
	> /etc/nginx/nginx.conf

	service nginx start
else
	delete cert.pem
	delete key.pem
	delete dhparams.pem
fi


days="$(node -e 'console.log(Math.floor(new Uint32Array(new Uint8Array(crypto.randomBytes(4)).buffer)[0] / 4294967296 * 7) + 1)')"
sleep ${days}d
/rekey.sh &
