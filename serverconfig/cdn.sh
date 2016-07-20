#!/bin/bash

# CDN node setup script for Ubuntu 14.04

cert='LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlIeWpDQ0JyS2dBd0lCQWdJUURJd1VxQ0V0UllibURReXpvSGp5VnpBTkJna3Foa2lHOXcwQkFRc0ZBREIxDQpNUXN3Q1FZRFZRUUdFd0pWVXpFVk1CTUdBMVVFQ2hNTVJHbG5hVU5sY25RZ1NXNWpNUmt3RndZRFZRUUxFeEIzDQpkM2N1WkdsbmFXTmxjblF1WTI5dE1UUXdNZ1lEVlFRREV5dEVhV2RwUTJWeWRDQlRTRUV5SUVWNGRHVnVaR1ZrDQpJRlpoYkdsa1lYUnBiMjRnVTJWeWRtVnlJRU5CTUI0WERURTFNRGd6TVRBd01EQXdNRm9YRFRFMk1URXpNREV5DQpNREF3TUZvd2dmUXhIVEFiQmdOVkJBOE1GRkJ5YVhaaGRHVWdUM0puWVc1cGVtRjBhVzl1TVJNd0VRWUxLd1lCDQpCQUdDTnp3Q0FRTVRBbFZUTVJrd0Z3WUxLd1lCQkFHQ056d0NBUUlUQ0VSbGJHRjNZWEpsTVJBd0RnWURWUVFGDQpFd2MxTmpBd01ETTVNU0l3SUFZRFZRUUpFeGt6TlRBd0lGTnZkWFJvSUVSMWNHOXVkQ0JJYVdkb2QyRjVNUTR3DQpEQVlEVlFRUkV3VXhPVGt3TVRFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRVJsYkdGM1lYSmxNUTR3DQpEQVlEVlFRSEV3VkViM1psY2pFVE1CRUdBMVVFQ2hNS1EzbHdhQ3dnU1c1akxqRVlNQllHQTFVRUF4TVBibUV1DQpZMlJ1TG1ONWNHZ3VZMjl0TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF2YmdtDQo2UHBkT1dCUGs5dGJtMTFQTDhWbU5UZkZlL2JZZmtWRit4QlU5N3FyUnRObEVZelZhWFZDdnJuNEkwNGNjMGlVDQpHSTZGaWl2NnI4N3I5eFVrb2t3akpBYVZmYndoNnlDalpDQU14S3VXRW01QVF2LzhSY25ldng4dTBJV0hjdWtUDQpCeTNzUitjUldsMVhIM1UwcHA1TGx0N0xaTkpoZzlHTjZtQUZoQzYzZXRRVHJ4STFaUzhqZVVTclhKeTEvdHN2DQpFbmlXN01pR3lUMHFiWmR5OXJ2UUcyZjdMR3IxSitmbGcyQm40NzZwVkpQeWlIV1Q1d1BBZnFtY1lGL256cml2DQo5QkdNbU1FMXJCRHloWDh2dkFIVTJ0aUdBNFdZRWkvY2Nad1lwc3JrZ0hFNmQwZ2RkVFhydWlHcitiL2szNWxzDQpUMmpnVjdzeTJGYUxRMTJTNFFJREFRQUJvNElEMURDQ0E5QXdId1lEVlIwakJCZ3dGb0FVUGROUXBkYWdyZTd6DQpTbUFLWmRNaDFQajQxZzh3SFFZRFZSME9CQllFRkFXdDB1Wkd2V3gwV2luM0VVdG9QcGU0YmlPcE1JR0lCZ05WDQpIUkVFZ1lBd2ZvSVBibUV1WTJSdUxtTjVjR2d1WTI5dGdnOWhaaTVqWkc0dVkzbHdhQzVqYjIyQ0QyRnpMbU5rDQpiaTVqZVhCb0xtTnZiWUlQWlhVdVkyUnVMbU41Y0dndVkyOXRnZzl2WXk1alpHNHVZM2x3YUM1amIyMkNEM05oDQpMbU5rYmk1amVYQm9MbU52YllJV1kzbHdhR1JpZVdocFpHUmxibUpvY3k1dmJtbHZiakFPQmdOVkhROEJBZjhFDQpCQU1DQmFBd0hRWURWUjBsQkJZd0ZBWUlLd1lCQlFVSEF3RUdDQ3NHQVFVRkJ3TUNNSFVHQTFVZEh3UnVNR3d3DQpOS0F5b0RDR0xtaDBkSEE2THk5amNtd3pMbVJwWjJsalpYSjBMbU52YlM5emFHRXlMV1YyTFhObGNuWmxjaTFuDQpNUzVqY213d05LQXlvRENHTG1oMGRIQTZMeTlqY213MExtUnBaMmxqWlhKMExtTnZiUzl6YUdFeUxXVjJMWE5sDQpjblpsY2kxbk1TNWpjbXd3UWdZRFZSMGdCRHN3T1RBM0JnbGdoa2dCaHYxc0FnRXdLakFvQmdnckJnRUZCUWNDDQpBUlljYUhSMGNITTZMeTkzZDNjdVpHbG5hV05sY25RdVkyOXRMME5RVXpDQmlBWUlLd1lCQlFVSEFRRUVmREI2DQpNQ1FHQ0NzR0FRVUZCekFCaGhob2RIUndPaTh2YjJOemNDNWthV2RwWTJWeWRDNWpiMjB3VWdZSUt3WUJCUVVIDQpNQUtHUm1oMGRIQTZMeTlqWVdObGNuUnpMbVJwWjJsalpYSjBMbU52YlM5RWFXZHBRMlZ5ZEZOSVFUSkZlSFJsDQpibVJsWkZaaGJHbGtZWFJwYjI1VFpYSjJaWEpEUVM1amNuUXdEQVlEVlIwVEFRSC9CQUl3QURDQ0FYNEdDaXNHDQpBUVFCMW5rQ0JBSUVnZ0Z1QklJQmFnRm9BSFlBcExrSmtMUVlXQlNIdXhPaXpHZHdDancxbUFUNUc5KzQ0M2ZODQpEc2dOM0JBQUFBRlAwV3FMOFFBQUJBTUFSekJGQWlBc3JnRVVyVVprbXJJQVVQZG5MY0V5Z2tjQkpwc3RvMEJIDQphblVVSnA1SnlBSWhBTks1dWhRa3FRMkNBb2s0b09wUlFwVEhKVEhXNWpNZG92bU9FUW5XUnRGZkFIWUFhUGFZDQorQjlrZ3I0NmpPNjVLQjFNL0hGUlhXZVQxRVRSQ21lc3UwOVArOFFBQUFGUDBXcUwrQUFBQkFNQVJ6QkZBaUVBDQpsZW85Nkx0WG5Va2J3ZnBhZ1VnMXVvL3JNQ3k1cldUOFJuMWhQOWpKRTVrQ0lHUktYWlV4dmY0YVZmZXVhYVNPDQo5Vm15TlEzaHVNZkpPcE1TSmlyQUt3WFdBSFlBVmhRR21pL1h3dXpUOWVHOVJMSSt4MFoydWJ5WkVWekE3NVNZDQpWZGFKME4wQUFBRlAwV3FORFFBQUJBTUFSekJGQWlFQXN3UmdFZUhwYTJIZnVDQzZ3TWg2MFI1TjZ5V1pXZytLDQphVUJVNGN5NkhQNENJRDBuVmVadmNFbFh4MzNXajJDeHJablByWUJzdENLM0FMRHF6NWJMeHhYYU1BMEdDU3FHDQpTSWIzRFFFQkN3VUFBNElCQVFDd09tNUdlMzZjSGRrcnpMa2djMFlyK0YzdVNyZDdyL3ZpNkUxTDFnVVZlK0R2DQpMNk5EL0VOR0QrMUdXc1hiY1RhSnd1amJwUWFiTm1oMnlKcUpXNENLb0hlajBSQWFGMk10WENURmNxNzBDWUM5DQp2WDdqeDlsbk1TL09oQmJOMFJ1Z0wwQWpkSnAyZThVOUU1QXpjbUg3SFlocU9wL3NPNXU3dnphUE14K1N0ci9KDQo3ZkRKT25keFI5ZlBtR1VBNmsvQmlZelpCd0I2RElkZzVISklBTkppYS9IalFmUHArNlRac3BiU2pJa1ZxTTdUDQpUa1lnQnh2UGxPRC9Td3N5djFFSHJWYmNmVVZuVXBCRlJ3eEpyM0hqaTJha2FoQVQ3eHMxY0Q0WE5OaDRmWkloDQpDK05yZWhKTEN0dS9Tald3eVlhb2wzbHJFUWlKNlo1OFFjR0VDQUpJDQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tDQotLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0NCk1JSUV0akNDQTU2Z0F3SUJBZ0lRREhtcFJMQ01FWlVna21GZjRtc2RnekFOQmdrcWhraUc5dzBCQVFzRkFEQnMNCk1Rc3dDUVlEVlFRR0V3SlZVekVWTUJNR0ExVUVDaE1NUkdsbmFVTmxjblFnU1c1ak1Sa3dGd1lEVlFRTEV4QjMNCmQzY3VaR2xuYVdObGNuUXVZMjl0TVNzd0tRWURWUVFERXlKRWFXZHBRMlZ5ZENCSWFXZG9JRUZ6YzNWeVlXNWoNClpTQkZWaUJTYjI5MElFTkJNQjRYRFRFek1UQXlNakV5TURBd01Gb1hEVEk0TVRBeU1qRXlNREF3TUZvd2RURUwNCk1Ba0dBMVVFQmhNQ1ZWTXhGVEFUQmdOVkJBb1RERVJwWjJsRFpYSjBJRWx1WXpFWk1CY0dBMVVFQ3hNUWQzZDMNCkxtUnBaMmxqWlhKMExtTnZiVEUwTURJR0ExVUVBeE1yUkdsbmFVTmxjblFnVTBoQk1pQkZlSFJsYm1SbFpDQlcNCllXeHBaR0YwYVc5dUlGTmxjblpsY2lCRFFUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0MNCmdnRUJBTmRUcEFSUitKbW1Ga2hMWnllcWswblFPZTBNc0xBQWgvRm5LSWFGakk1ajJyeXhRRGppMC9Yc3BRVVkNCnVEMCt4WmtYTXV3WWpQcnhES1prSVlYTEJ4QTBzRktJS3g5b205S3hqeEt3czlMbmlCOGY3emgzVkZOZmdIay8NCkxocXFxQjVMS3cycnQyTzVOYmQ5Rkx4WlM5OVJTdEtoNGd6aWtJS0hhcTdxMTJUV21GWG8vYThhVUd4VXZCSHkNCi9VcnluYnQvRHZUVnZvNFdpUkpWMk1CeE5PNzIzQzNzeEljbGhvM1lJZVN3VFF5SjNEa21GOTMyMTVTRjJBUWgNCmNKMXZiLzljdWhuaFJjdFdWeWgrSEExQlY2cTN1Q2U3c2VUNkt1OGhJM1VhclMyYmhqV01uSGUxYzYzWWxDM2sNCjh3eWQ3c0ZPWW40WHdIR2VMTjd4K1JBb0dUTUNBd0VBQWFPQ0FVa3dnZ0ZGTUJJR0ExVWRFd0VCL3dRSU1BWUINCkFmOENBUUF3RGdZRFZSMFBBUUgvQkFRREFnR0dNQjBHQTFVZEpRUVdNQlFHQ0NzR0FRVUZCd01CQmdnckJnRUYNCkJRY0RBakEwQmdnckJnRUZCUWNCQVFRb01DWXdKQVlJS3dZQkJRVUhNQUdHR0doMGRIQTZMeTl2WTNOd0xtUnANCloybGpaWEowTG1OdmJUQkxCZ05WSFI4RVJEQkNNRUNnUHFBOGhqcG9kSFJ3T2k4dlkzSnNOQzVrYVdkcFkyVnkNCmRDNWpiMjB2UkdsbmFVTmxjblJJYVdkb1FYTnpkWEpoYm1ObFJWWlNiMjkwUTBFdVkzSnNNRDBHQTFVZElBUTINCk1EUXdNZ1lFVlIwZ0FEQXFNQ2dHQ0NzR0FRVUZCd0lCRmh4b2RIUndjem92TDNkM2R5NWthV2RwWTJWeWRDNWoNCmIyMHZRMUJUTUIwR0ExVWREZ1FXQkJROTAxQ2wxcUN0N3ZOS1lBcGwweUhVK1BqV0R6QWZCZ05WSFNNRUdEQVcNCmdCU3hQc05wQS9pL1J3SFVtQ1lhQ0FMdlkyUXJ3ekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBbmJiUWtJYmgNCmhnTHR4YUR3TkJ4MHdZMTJ6SVlLcVBCS2lrTFdQOGlwVGExOENLM210bEM0b2hwTmlBZXhLU0hjNTlyR1BDSGcNCjR4RkpjS3g2SFFHa3loRTZWNnQ5VnlwQWRQM1RIWVVZVU45WFIzV2hmVlVnTGtjM1VIS01mNEliMG1LUExRTmENCjJzUElvYzRzVXFJQVkrdHp1bkhJU1NjamwyU0ZuamdPcldOb1BMcFNnVmg1b3l3TTM5NXQ2ekh5dXFCOGJQRXMNCjFPRzlkNFEzQTg0eXRjaWFnUnBLa2s0N1JwcUYvb09pK1o2TW84d05Yck05endSNGp4UVVlektjeHdDbVhNUzENCm9WV05XbFpvcENKd3FqeUJjZG1kcUVVNzlPWDJvbEhkeDN0aTZHOE1kT3U0MnZpL2h3MTVVSkdRbXhnN2tWa24NCjhUVW9FNnNtZnRYM2VnPT0NCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0NCg=='
key='ASK RYAN FOR THIS'


dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-add-repository -y ppa:ondrej/nginx
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes install aptitude nginx openssl unzip

mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl
echo "${cert}" | base64 --decode > /etc/nginx/ssl/cert.pem
echo "${key}" | base64 --decode > /etc/nginx/ssl/key.pem
openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048


cat > /etc/nginx/nginx.conf << EndOfMessage
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
	worker_connections $(ulimit -n);
	multi_accept off;
}

http {

	##
	# Basic Settings
	##

	sendfile on;
	tcp_nopush on;
	tcp_nodelay on;
	keepalive_timeout 65;
	types_hash_max_size 2048;
	server_tokens off;
	server_names_hash_bucket_size 64;
	include /etc/nginx/mime.types;
	default_type application/octet-stream;

	##
	# Logging Settings
	##

	access_log off;
	error_log /dev/null crit;

	##
	# Gzip Settings
	##

	gzip on;
	gzip_http_version 1.0;
	gzip_static always;

	##
	# Server Settings
	##

	server {
		listen 443 ssl http2;
		listen [::]:443 ipv6only=on;

		ssl_certificate ssl/cert.pem;
		ssl_certificate_key ssl/key.pem;
		ssl_dhparam ssl/dhparams.pem;

		ssl_session_timeout 1d;
		ssl_session_cache shared:SSL:50m;

		ssl_prefer_server_ciphers on;
		add_header Strict-Transport-Security 'max-age=31536000; includeSubdomains';
		ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
		ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK';

		ssl_stapling on;
		ssl_stapling_verify on;

		root /cyphcdn;
		index index.html;

		add_header Cache-Control 'public, max-age=31536000';
		add_header Access-Control-Allow-Origin '*';
		add_header Access-Control-Allow-Methods 'GET';
	}
}
EndOfMessage


cat > /cyphcdn.sh << EndOfMessage
#!/bin/bash

mkdir /cyphcdn.new
cd /cyphcdn.new

wget https://github.com/cyph/cdn/archive/master.zip -O dothemove.zip
unzip dothemove.zip
rm dothemove.zip
repo="\$(ls)"
repoCount="\$(ls | wc -l)"
if [ \$repoCount == 1 ] ; then
	mv \$repo/* ./
	rm -rf \$repo
fi
chmod 777 -R .

cd /

if [ -d /cyphcdn.new/websign ] ; then
	rm -rf /cyphcdn.old
	mv /cyphcdn /cyphcdn.old
	mv /cyphcdn.new /cyphcdn
else
	rm -rf /cyphcdn.new
fi
EndOfMessage


cat > /update.sh << EndOfMessage
#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
echo "**************" >> /var/log/apt-security-updates
date >> /var/log/apt-security-updates
aptitude update >> /var/log/apt-security-updates
aptitude safe-upgrade -o Aptitude::Delete-Unused=false --assume-yes --target-release \`lsb_release -cs\`-security >> /var/log/apt-security-updates
reboot
EndOfMessage


rm -rf /cyphcdn
chmod 700 /cyphcdn.sh /update.sh
/cyphcdn.sh

updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /cyphcdn.cron
echo '0,30 * * * * /cyphcdn.sh' >> /cyphcdn.cron
echo "45 ${updatehour} * * ${updateday} /update.sh" >> /cyphcdn.cron
crontab /cyphcdn.cron
rm /cyphcdn.cron

rm cdn.sh
reboot
