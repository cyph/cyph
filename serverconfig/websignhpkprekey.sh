#!/bin/bash

# WebSign HPKP re-key script, for denying availability after the first use

apikey='ASK RYAN FOR THIS'
order='ASK RYAN FOR THIS'
conf='dXNlciB3d3ctZGF0YTsKd29ya2VyX3Byb2Nlc3NlcyBhdXRvOwpwaWQgL3J1bi9uZ2lueC5waWQ7CgpldmVudHMgewoJd29ya2VyX2Nvbm5lY3Rpb25zIDc2ODsKCW11bHRpX2FjY2VwdCBvZmY7Cn0KCmh0dHAgewoKCSMjCgkjIEJhc2ljIFNldHRpbmdzCgkjIwoKCXNlbmRmaWxlIG9uOwoJdGNwX25vcHVzaCBvbjsKCXRjcF9ub2RlbGF5IG9uOwoJa2VlcGFsaXZlX3RpbWVvdXQgNjU7Cgl0eXBlc19oYXNoX21heF9zaXplIDIwNDg7CglzZXJ2ZXJfdG9rZW5zIG9mZjsKCXNlcnZlcl9uYW1lc19oYXNoX2J1Y2tldF9zaXplIDY0OwoJaW5jbHVkZSAvZXRjL25naW54L21pbWUudHlwZXM7CglkZWZhdWx0X3R5cGUgYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtOwoKCSMjCgkjIExvZ2dpbmcgU2V0dGluZ3MKCSMjCgoJYWNjZXNzX2xvZyBvZmY7CgllcnJvcl9sb2cgL2Rldi9udWxsIGNyaXQ7CgoJIyMKCSMgR3ppcCBTZXR0aW5ncwoJIyMKCglnemlwIG9uOwoJZ3ppcF9odHRwX3ZlcnNpb24gMS4wOwoJZ3ppcF9zdGF0aWMgYWx3YXlzOwoKCSMjCgkjIFNlcnZlciBTZXR0aW5ncwoJIyMKCglzZXJ2ZXIgewoJCWxpc3RlbiA0NDMgc3NsOwoJCWxpc3RlbiBbOjpdOjQ0MyBpcHY2b25seT1vbjsKCgkJc3NsX2NlcnRpZmljYXRlIHNzbC9jZXJ0LnBlbTsKCQlzc2xfY2VydGlmaWNhdGVfa2V5IHNzbC9rZXkucGVtOwoJCXNzbF9kaHBhcmFtIHNzbC9kaHBhcmFtcy5wZW07CgoJCXNzbF9zZXNzaW9uX3RpbWVvdXQgMWQ7CgkJc3NsX3Nlc3Npb25fY2FjaGUgc2hhcmVkOlNTTDo1MG07CgoJCXNzbF9wcmVmZXJfc2VydmVyX2NpcGhlcnMgb247CgkJYWRkX2hlYWRlciBQdWJsaWMtS2V5LVBpbnMgJ21heC1hZ2U9MzE1MzYwMDA7IGluY2x1ZGVTdWJkb21haW5zOyBwaW4tc2hhMjU2PSJLRVlfSEFTSCI7IHBpbi1zaGEyNTY9IkFNUlQ2N2hOMUtQSSt1N0F3OUpwWmx6eVJhS2VPKzZ1MkgranRPbVdWeTg9Iic7CgkJYWRkX2hlYWRlciBTdHJpY3QtVHJhbnNwb3J0LVNlY3VyaXR5ICdtYXgtYWdlPTMxNTM2MDAwOyBpbmNsdWRlU3ViZG9tYWlucyc7CgkJc3NsX3Byb3RvY29scyBUTFN2MSBUTFN2MS4xIFRMU3YxLjI7CgkJc3NsX2NpcGhlcnMgJ0VDREhFLVJTQS1BRVMxMjgtR0NNLVNIQTI1NjpFQ0RIRS1FQ0RTQS1BRVMxMjgtR0NNLVNIQTI1NjpFQ0RIRS1SU0EtQUVTMjU2LUdDTS1TSEEzODQ6RUNESEUtRUNEU0EtQUVTMjU2LUdDTS1TSEEzODQ6REhFLVJTQS1BRVMxMjgtR0NNLVNIQTI1NjpESEUtRFNTLUFFUzEyOC1HQ00tU0hBMjU2OmtFREgrQUVTR0NNOkVDREhFLVJTQS1BRVMxMjgtU0hBMjU2OkVDREhFLUVDRFNBLUFFUzEyOC1TSEEyNTY6RUNESEUtUlNBLUFFUzEyOC1TSEE6RUNESEUtRUNEU0EtQUVTMTI4LVNIQTpFQ0RIRS1SU0EtQUVTMjU2LVNIQTM4NDpFQ0RIRS1FQ0RTQS1BRVMyNTYtU0hBMzg0OkVDREhFLVJTQS1BRVMyNTYtU0hBOkVDREhFLUVDRFNBLUFFUzI1Ni1TSEE6REhFLVJTQS1BRVMxMjgtU0hBMjU2OkRIRS1SU0EtQUVTMTI4LVNIQTpESEUtRFNTLUFFUzEyOC1TSEEyNTY6REhFLVJTQS1BRVMyNTYtU0hBMjU2OkRIRS1EU1MtQUVTMjU2LVNIQTpESEUtUlNBLUFFUzI1Ni1TSEE6IWFOVUxMOiFlTlVMTDohRVhQT1JUOiFERVM6IVJDNDohM0RFUzohTUQ1OiFQU0snOwoKCQlzc2xfc3RhcGxpbmcgb247CgkJc3NsX3N0YXBsaW5nX3ZlcmlmeSBvbjsKCX0KCglzZXJ2ZXIgewoJCWxpc3RlbiA0NDMgc3NsOwoJCWxpc3RlbiBbOjpdOjQ0MyBpcHY2b25seT1vbjsKCQlzZXJ2ZXJfbmFtZSB3d3cuY3lwaC5pbTsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC1pbS1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA0NDMgc3NsOwoJCWxpc3RlbiBbOjpdOjQ0MyBpcHY2b25seT1vbjsKCQlzZXJ2ZXJfbmFtZSB3d3cuY3lwaC5pbzsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC1pby1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA0NDMgc3NsOwoJCWxpc3RlbiBbOjpdOjQ0MyBpcHY2b25seT1vbjsKCQlzZXJ2ZXJfbmFtZSB3d3cuY3lwaC5tZTsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC1tZS1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA0NDMgc3NsOwoJCWxpc3RlbiBbOjpdOjQ0MyBpcHY2b25seT1vbjsKCQlzZXJ2ZXJfbmFtZSB3d3cuY3lwaC52aWRlbzsKCgkJbG9jYXRpb24gLyB7CgkJCXJld3JpdGUgLyguKikgLyQxIGJyZWFrOwoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtY3lwaC12aWRlby1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9Cgl9CgoJc2VydmVyIHsKCQlsaXN0ZW4gODA7CgkJc2VydmVyX25hbWUgY3lwaC5pbSB3d3cuY3lwaC5pbTsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vd3d3LmN5cGguaW0kcmVxdWVzdF91cmk7Cgl9CglzZXJ2ZXIgewoJCWxpc3RlbiA4MDsKCQlzZXJ2ZXJfbmFtZSBjeXBoLmlvIHd3dy5jeXBoLmlvOwoJCXJldHVybiAzMDEgaHR0cHM6Ly93d3cuY3lwaC5pbyRyZXF1ZXN0X3VyaTsKCX0KCXNlcnZlciB7CgkJbGlzdGVuIDgwOwoJCXNlcnZlcl9uYW1lIGN5cGgubWUgd3d3LmN5cGgubWU7CgkJcmV0dXJuIDMwMSBodHRwczovL3d3dy5jeXBoLm1lJHJlcXVlc3RfdXJpOwoJfQoJc2VydmVyIHsKCQlsaXN0ZW4gODA7CgkJc2VydmVyX25hbWUgY3lwaC52aWRlbyB3d3cuY3lwaC52aWRlbzsKCQlyZXR1cm4gMzAxIGh0dHBzOi8vd3d3LmN5cGgudmlkZW8kcmVxdWVzdF91cmk7Cgl9Cn0K'

function delete {
	for i in {1..10} ; do
		dd if=/dev/urandom of="${1}" bs=1024 count="$(du -k "${1}" | cut -f1)"
	done

	rm "${1}"
}


mkdir -p /tmp/websignhpkprekey
cd /tmp/websignhpkprekey

openssl dhparam -out dhparams.pem 2048
openssl req -new -newkey rsa:2048 -nodes -out csr.pem -keyout key.pem -subj '/C=US/ST=Delaware/L=Dover/O=Cyph, Inc./CN=www.cyph.im'

curl -s -u "${apikey}" -X POST \
	-H 'X-HTTP-Method-Override: REISSUE' \
	-H 'Content-Type: application/vnd.digicert.rest-v1+json' \
	--data "$(node -e 'console.log(JSON.stringify({csr: require("fs").readFileSync("csr.pem").toString().trim()}))')" \
	"https://api.digicert.com/order/${order}"

delete csr.pem

sleep 5m

node -e "
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
		sed "s|worker_connections 768;|worker_connections $(ulimit -n);|g" \
		sed "s|KEY_HASH|${keyHash}|g" \
	> /etc/nginx/nginx.conf

	service nginx start
else
	delete cert.pem
	delete key.pem
	delete dhparams.pem
fi
