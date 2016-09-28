#!/bin/bash

# Tor server setup script for Ubuntu 16.04

rekeyscript='base64 hpkpsuicide.sh'

apikey='ASK RYAN FOR THIS'
orderid='ASK RYAN FOR THIS'
csrSubject='/C=US/ST=Delaware/L=Dover/O=Cyph, Inc./CN=cyphdbyhiddenbhs.onion'

onionaddress='cyphdbyhiddenbhs.onion'
onionkey='ASK RYAN FOR THIS'
cert='LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUlBakNDQnVxZ0F3SUJBZ0lRRHVPRTZFTGtJUWRuczJsQXR1QVhCekFOQmdrcWhraUc5dzBCQVFzRkFEQjEKTVFzd0NRWURWUVFHRXdKVlV6RVZNQk1HQTFVRUNoTU1SR2xuYVVObGNuUWdTVzVqTVJrd0Z3WURWUVFMRXhCMwpkM2N1WkdsbmFXTmxjblF1WTI5dE1UUXdNZ1lEVlFRREV5dEVhV2RwUTJWeWRDQlRTRUV5SUVWNGRHVnVaR1ZrCklGWmhiR2xrWVhScGIyNGdVMlZ5ZG1WeUlFTkJNQjRYRFRFMk1ERXlNREF3TURBd01Gb1hEVEUzTURFeU5ERXkKTURBd01Gb3dnZnN4SFRBYkJnTlZCQThNRkZCeWFYWmhkR1VnVDNKbllXNXBlbUYwYVc5dU1STXdFUVlMS3dZQgpCQUdDTnp3Q0FRTVRBbFZUTVJrd0Z3WUxLd1lCQkFHQ056d0NBUUlUQ0VSbGJHRjNZWEpsTVJBd0RnWURWUVFGCkV3YzFOakF3TURNNU1TSXdJQVlEVlFRSkV4a3pOVEF3SUZOdmRYUm9JRVIxY0c5dWRDQklhV2RvZDJGNU1RNHcKREFZRFZRUVJFd1V4T1Rrd01URUxNQWtHQTFVRUJoTUNWVk14RVRBUEJnTlZCQWdUQ0VSbGJHRjNZWEpsTVE0dwpEQVlEVlFRSEV3VkViM1psY2pFVE1CRUdBMVVFQ2hNS1EzbHdhQ3dnU1c1akxqRWZNQjBHQTFVRUF4TVdZM2x3CmFHUmllV2hwWkdSbGJtSm9jeTV2Ym1sdmJqQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0MKZ2dFQkFOazQrSHhob1RVQzZIdFVwWjYzMUhKaUV3VzZmZVBTRTVDWDRVVjN5NldicWJJOTlHTUxqb1BIQ1hXUQozMlVJZi85ZW1Ub25IaktQZDg2N1k1SmNKZG90d1JOaFdKN3N3eWt5K2dUZlRVbER6SDVnNy9BdGZEbUZraFJxCldod29WQUh2N1Q3aHE2WllrN1VjYU1HaXJhZGlKOXRIQ3hiZUV2cW9sOHBSNEFBVTRJTUVhMUl2blFjaWtRNEMKMDhmTWFFdXFEbjBISmg2cnFaQUtJWXNoRDhCVk1hZWRMT21LUFVMMlZEUjRTSStzU3l1L1pVSy94VHdmN2RYaQp6NEtSV3F0ZUhBMmJZcUdBS2dkQVkxU0JjcjVKa1dxQzRKUzNnN2R2c3Q4V0VrT0MrL2hiR2N5VWs5WW1Jd2luCjVySlVTNUtQaDQ2NEx6bExRc2RrNXRNRGVBTUNBd0VBQWFPQ0JBVXdnZ1FCTUI4R0ExVWRJd1FZTUJhQUZEM1QKVUtYV29LM3U4MHBnQ21YVElkVDQrTllQTUIwR0ExVWREZ1FXQkJUSnNOMC84R3NDUDlkZ0pWaXFiTFhCSFlCZgpTREE3QmdOVkhSRUVOREF5Z2haamVYQm9aR0o1YUdsa1pHVnVZbWh6TG05dWFXOXVnaGdxTG1ONWNHaGtZbmxvCmFXUmtaVzVpYUhNdWIyNXBiMjR3RGdZRFZSMFBBUUgvQkFRREFnV2dNQjBHQTFVZEpRUVdNQlFHQ0NzR0FRVUYKQndNQkJnZ3JCZ0VGQlFjREFqQjFCZ05WSFI4RWJqQnNNRFNnTXFBd2hpNW9kSFJ3T2k4dlkzSnNNeTVrYVdkcApZMlZ5ZEM1amIyMHZjMmhoTWkxbGRpMXpaWEoyWlhJdFp6RXVZM0pzTURTZ01xQXdoaTVvZEhSd09pOHZZM0pzCk5DNWthV2RwWTJWeWRDNWpiMjB2YzJoaE1pMWxkaTF6WlhKMlpYSXRaekV1WTNKc01Fc0dBMVVkSUFSRU1FSXcKTndZSllJWklBWWI5YkFJQk1Db3dLQVlJS3dZQkJRVUhBZ0VXSEdoMGRIQnpPaTh2ZDNkM0xtUnBaMmxqWlhKMApMbU52YlM5RFVGTXdCd1lGWjRFTUFRRXdnWWdHQ0NzR0FRVUZCd0VCQkh3d2VqQWtCZ2dyQmdFRkJRY3dBWVlZCmFIUjBjRG92TDI5amMzQXVaR2xuYVdObGNuUXVZMjl0TUZJR0NDc0dBUVVGQnpBQ2hrWm9kSFJ3T2k4dlkyRmoKWlhKMGN5NWthV2RwWTJWeWRDNWpiMjB2UkdsbmFVTmxjblJUU0VFeVJYaDBaVzVrWldSV1lXeHBaR0YwYVc5dQpVMlZ5ZG1WeVEwRXVZM0owTUF3R0ExVWRFd0VCL3dRQ01BQXdnZ0gwQmdvckJnRUVBZFo1QWdRQ0JJSUI1QVNDCkFlQUIzZ0IyQUtTNUNaQzBHRmdVaDdzVG9zeG5jQW84TlpnRStSdmZ1T04zelE3SURkd1FBQUFCVjJrODZPb0EKQUFRREFFY3dSUUloQUoyZjZ5L29TRWRhczJWdmZ4d0pxQjFsemd1TnpMeEh0U2FUZFdFK1dTQzhBaUE2ZE8yZApPQjFPNnF4TnorTDZkb3hZc3lyR0g4RVR0VUJUNkhWVmsrVkVvUUIyQUdqMm1QZ2ZaSUsrT296dXVTZ2RUUHh4ClVWMW5rOVJFMFFwbnJMdFBUL3ZFQUFBQlYyazg2TDRBQUFRREFFY3dSUUlnYTZYS2RtVE1rRXVmT1JXUHBNSXkKWG9GWTg0cDZld3VCWjMwU0lnSkhsbUlDSVFDVC9wK1U2aS9JSjZFWjJuM3FNQWQxM1pncXZISG9lMVFKMHlZTQpxVTYza0FCMUFGWVVCcG92MThMczAvWGh2VVN5UHNkR2RybThtUkZjd08rVW1GWFdpZERkQUFBQlYyazg2VElBCkFBUURBRVl3UkFJZ1lPQkFVcFgxRUpSMk9qb25PRTl2OU5sRExuYUlZdENoOWlDYmVFbXBZb29DSUhyQm9YUHoKTlJEMWhHL3dLakl1Y1ErRkFiejVCV2N1dkw4MFgxTHkrTWZkQUhVQTdrdTl0M1hPWUxyaFFta2ZxK0dlWnFNUApmbCt3Y3RpREFNUjdpWHFvL2NzQUFBRlhhVHpyYndBQUJBTUFSakJFQWlBUzI2aHJYTkFBNUlEcElzVmZvMjlSCkdSOHd5T2diT1NWYnl0bC9oY1pBWEFJZ0Q4MXltVXRJM1ZuWTB4ZEdwUHVvV0E0ZnB3UThaUC9jSEMvY1ZmRm8KQjJRd0RRWUpLb1pJaHZjTkFRRUxCUUFEZ2dFQkFBVWd0UkVFT3M3eUE5bWNqMnIzUjVveHZVOVU3eGtpMGFBbQo2OWI3UUthZFlFQ2RvcjZESy9LbVUwZEduek84RXBSdHhKQnAvZTNPQzI2Z094cE0rYWNPNVNDNmxick16WVI4CnhLOFl0YzdUOG5lNERidXZ1anY1RHJMcmIvQVRHYzZmanNCcG5XUTVLcWNxUDFzRkVYYlZOVlVVT0xEWFIyRFcKN1NlMDZwdHN0ZTBCU1pTY2FiM25iR0NyeUJ1aWZVVXlEdnYvdGVuSmlISmExTFN1TDI2b3RJVkl4akcvZlJlWApDbmVGVjQ4ZUxaMEdvbXZ0NDRjWms1SFFhTXVtVkdSOVdQeUhqUHB4SDhxQm1Oa3pQSktOK3FlUmZCWHVsa3VECi9YZUsyL3pzRGJBZjZlQzJ6elZpcXNwNGQyeHFNQWpVMS9yWHdZOTlvcTMyemRtZUp4cz0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQotLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0KTUlJRXRqQ0NBNTZnQXdJQkFnSVFESG1wUkxDTUVaVWdrbUZmNG1zZGd6QU5CZ2txaGtpRzl3MEJBUXNGQURCcwpNUXN3Q1FZRFZRUUdFd0pWVXpFVk1CTUdBMVVFQ2hNTVJHbG5hVU5sY25RZ1NXNWpNUmt3RndZRFZRUUxFeEIzCmQzY3VaR2xuYVdObGNuUXVZMjl0TVNzd0tRWURWUVFERXlKRWFXZHBRMlZ5ZENCSWFXZG9JRUZ6YzNWeVlXNWoKWlNCRlZpQlNiMjkwSUVOQk1CNFhEVEV6TVRBeU1qRXlNREF3TUZvWERUSTRNVEF5TWpFeU1EQXdNRm93ZFRFTApNQWtHQTFVRUJoTUNWVk14RlRBVEJnTlZCQW9UREVScFoybERaWEowSUVsdVl6RVpNQmNHQTFVRUN4TVFkM2QzCkxtUnBaMmxqWlhKMExtTnZiVEUwTURJR0ExVUVBeE1yUkdsbmFVTmxjblFnVTBoQk1pQkZlSFJsYm1SbFpDQlcKWVd4cFpHRjBhVzl1SUZObGNuWmxjaUJEUVRDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQwpnZ0VCQU5kVHBBUlIrSm1tRmtoTFp5ZXFrMG5RT2UwTXNMQUFoL0ZuS0lhRmpJNWoycnl4UURqaTAvWHNwUVVZCnVEMCt4WmtYTXV3WWpQcnhES1prSVlYTEJ4QTBzRktJS3g5b205S3hqeEt3czlMbmlCOGY3emgzVkZOZmdIay8KTGhxcXFCNUxLdzJydDJPNU5iZDlGTHhaUzk5UlN0S2g0Z3ppa0lLSGFxN3ExMlRXbUZYby9hOGFVR3hVdkJIeQovVXJ5bmJ0L0R2VFZ2bzRXaVJKVjJNQnhOTzcyM0Mzc3hJY2xobzNZSWVTd1RReUozRGttRjkzMjE1U0YyQVFoCmNKMXZiLzljdWhuaFJjdFdWeWgrSEExQlY2cTN1Q2U3c2VUNkt1OGhJM1VhclMyYmhqV01uSGUxYzYzWWxDM2sKOHd5ZDdzRk9ZbjRYd0hHZUxON3grUkFvR1RNQ0F3RUFBYU9DQVVrd2dnRkZNQklHQTFVZEV3RUIvd1FJTUFZQgpBZjhDQVFBd0RnWURWUjBQQVFIL0JBUURBZ0dHTUIwR0ExVWRKUVFXTUJRR0NDc0dBUVVGQndNQkJnZ3JCZ0VGCkJRY0RBakEwQmdnckJnRUZCUWNCQVFRb01DWXdKQVlJS3dZQkJRVUhNQUdHR0doMGRIQTZMeTl2WTNOd0xtUnAKWjJsalpYSjBMbU52YlRCTEJnTlZIUjhFUkRCQ01FQ2dQcUE4aGpwb2RIUndPaTh2WTNKc05DNWthV2RwWTJWeQpkQzVqYjIwdlJHbG5hVU5sY25SSWFXZG9RWE56ZFhKaGJtTmxSVlpTYjI5MFEwRXVZM0pzTUQwR0ExVWRJQVEyCk1EUXdNZ1lFVlIwZ0FEQXFNQ2dHQ0NzR0FRVUZCd0lCRmh4b2RIUndjem92TDNkM2R5NWthV2RwWTJWeWRDNWoKYjIwdlExQlRNQjBHQTFVZERnUVdCQlE5MDFDbDFxQ3Q3dk5LWUFwbDB5SFUrUGpXRHpBZkJnTlZIU01FR0RBVwpnQlN4UHNOcEEvaS9Sd0hVbUNZYUNBTHZZMlFyd3pBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQW5iYlFrSWJoCmhnTHR4YUR3TkJ4MHdZMTJ6SVlLcVBCS2lrTFdQOGlwVGExOENLM210bEM0b2hwTmlBZXhLU0hjNTlyR1BDSGcKNHhGSmNLeDZIUUdreWhFNlY2dDlWeXBBZFAzVEhZVVlVTjlYUjNXaGZWVWdMa2MzVUhLTWY0SWIwbUtQTFFOYQoyc1BJb2M0c1VxSUFZK3R6dW5ISVNTY2psMlNGbmpnT3JXTm9QTHBTZ1ZoNW95d00zOTV0NnpIeXVxQjhiUEVzCjFPRzlkNFEzQTg0eXRjaWFnUnBLa2s0N1JwcUYvb09pK1o2TW84d05Yck05endSNGp4UVVlektjeHdDbVhNUzEKb1ZXTldsWm9wQ0p3cWp5QmNkbWRxRVU3OU9YMm9sSGR4M3RpNkc4TWRPdTQydmkvaHcxNVVKR1FteGc3a1Zrbgo4VFVvRTZzbWZ0WDNlZz09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K'
key='ASK RYAN FOR THIS'


cd $(cd "$(dirname "$0")"; pwd)

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes install curl lsb-release apt-transport-https
apt-get -y --force-yes purge apache* mysql*
distro="$(lsb_release -c | awk '{print $2}')"
echo "
	deb http://deb.torproject.org/torproject.org ${distro} main
	deb https://deb.nodesource.com/node_6.x ${distro} main
" >> /etc/apt/sources.list
gpg --keyserver keys.gnupg.net --recv 886DDD89
gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | apt-key add -
curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes install apt dpkg nginx openssl nodejs deb.torproject.org-keyring tor

mkdir -p /etc/nginx/ssl/websign
chmod 600 -R /etc/nginx/ssl
echo "${cert}" | base64 --decode > /etc/nginx/ssl/cert.pem
echo "${key}" | base64 --decode > /etc/nginx/ssl/key.pem
openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048
echo 'tmpfs /etc/nginx/ssl/websign tmpfs rw,size=50M 0 0' >> /etc/fstab
mount --all

echo '
	HiddenServiceDir /var/lib/tor/hidden_service/
	HiddenServicePort 80 127.0.0.1:8080
	HiddenServicePort 443 127.0.0.1:8081
' >> /etc/tor/torrc

mkdir /var/lib/tor/hidden_service/
echo "${onionaddress}" > /var/lib/tor/hidden_service/hostname
echo "${onionkey}" | base64 --decode > /var/lib/tor/hidden_service/private_key
chown -R debian-tor:debian-tor /var/lib/tor/hidden_service/
chmod -R 0700 /var/lib/tor/hidden_service/

umask 077


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes -o Dpkg::Options::=--force-confdef upgrade
do-release-upgrade -f DistUpgradeViewNonInteractive

reboot
EndOfMessage


staticSSL='$(
	echo "${sslconf}" |
	sed "s|ssl/websign|ssl|g" |
	sed "s|\${keyHash}|L8VDNR3M39gVmkDK8uGIc5Qx9Cms3fh8/hw5rWqPEbA=|g" |
	sed "s|\${backupHash}|qkfPaU8MSHYMoMxAH8DGToHOQJNW8NgpNvx+EtIPCbw=|g"
)'

read -r -d '' nginxconf <<- EOM
	proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cdn:50m max_size=5g inactive=24h;

	server {
		${staticSSL}
		server_name cyphdbyhiddenbhs.onion;
		return 301 https://www.cyphdbyhiddenbhs.onion\\\$request_uri;
	}

	server {
		${staticSSL}
		server_name www.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-com-dot-cyphme.appspot.com)
	}
	server {
		${staticSSL}
		server_name api.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-default-dot-cyphme.appspot.com)
	}

	server {
		${staticSSL}
		server_name cdn.cyphdbyhiddenbhs.onion;

		location / {
			rewrite /(.*) /\\\$1 break;
			proxy_pass https://eu.cdn.cyph.com/;
			proxy_cache cdn;
			proxy_hide_header Public-Key-Pins;
			proxy_hide_header Strict-Transport-Security;
		}
	}

	server {
		${staticSSL}
		server_name ping.cyphdbyhiddenbhs.onion;

		location = / {
			add_header Content-Type 'text/plain';
			add_header Access-Control-Allow-Origin '*';
			add_header Access-Control-Allow-Methods 'GET';
			return 200 pong;
		}
	}

	server {
		\${sslconf}
		server_name im.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-im-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name io.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-io-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name me.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-me-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name video.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-video-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name audio.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-audio-dot-cyphme.appspot.com)
	}

	server {
		\${sslconf}
		server_name ~.*\\.cyphdbyhiddenbhs\\.onion;
		\$(proxysite https://prod-dot-websign-dot-cyphme.appspot.com)
	}

	server {
		listen 127.0.0.1:8080 default_server;
		server_name _;
		return 301 https://\\\$host\\\$request_uri;
	}
EOM


rekeyscriptDecoded="$(
	echo "${rekeyscript}" | base64 --decode |
	sed "s|API_KEY|${apikey}|g" |
	sed "s|ORDER_ID|${orderid}|g" |
	sed "s|CSR_SUBJECT|${csrSubject}|g" |
	sed 's|ssl/|ssl/websign/|g'
)"
echo "${rekeyscriptDecoded/NGINX_CONF/$nginxconf}" | sed 's|443|8081|g' > /hpkpsuicide.sh


chmod 700 /systemupdate.sh /hpkpsuicide.sh
umask 022

updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /tmp/cyph.cron
echo '@reboot /hpkpsuicide.sh' >> /tmp/cyph.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cyph.cron
crontab /tmp/cyph.cron
rm /tmp/cyph.cron

rm tor.sh
reboot
