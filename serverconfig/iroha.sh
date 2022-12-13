#!/bin/bash

# HyperLedger Iroha setup script for Debian

# Iroha configuration
irohaBlockStoreVolume='iroha-block-store'
irohaContainerName='iroha'
irohaNetworkName='iroha-network'
irohaPath='/opt/iroha'
irohaPort='50051'

# Postgres configuration
postgresContainerName='some-postgres'
postgresPassword='mysecretpassword'
postgresPort='5432'
postgresUsername='postgres'

# Install dependencies
if ! docker &> /dev/null ; then
	export DEBIAN_FRONTEND=noninteractive
	apt-get -y --allow-downgrades update
	apt-get -y --allow-downgrades upgrade

	apt-get -y --allow-downgrades install apt-utils
	apt-get -y --allow-downgrades install \
		apt \
		apt-transport-https \
		build-essential \
		curl \
		dpkg \
		git \
		gnupg2 \
		lsb-release

	distro="$(lsb_release -cs)"

	echo "deb https://deb.nodesource.com/node_18.x ${distro} main" >> /etc/apt/sources.list
	curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
	echo "deb https://download.docker.com/linux/debian ${distro} stable" >> /etc/apt/sources.list
	curl https://download.docker.com/linux/debian/gpg | apt-key add -

	apt-get -y --allow-downgrades update
	apt-get -y --allow-downgrades upgrade
	apt-get -y --allow-downgrades install \
		containerd.io \
		docker-ce \
		docker-ce-cli \
		docker-compose-plugin \
		nodejs \
		unzip \
		wget

	wget https://github.com/improbable-eng/grpc-web/releases/download/v0.15.0/grpcwebproxy-v0.15.0-linux-x86_64.zip
	unzip grpcwebproxy-v0.15.0-linux-x86_64.zip
	mv dist/grpcwebproxy-v0.15.0-linux-x86_64 /usr/bin/grpcwebproxy
	rm -rf dist grpcwebproxy-v0.15.0-linux-x86_64.zip
	chmod +x /usr/bin/grpcwebproxy
fi

# Add iroha-cli host command for convenience
if [ ! -f /usr/bin/iroha-cli ] ; then
	cat > /usr/bin/iroha-cli <<- EOM
		#!/bin/bash
		sudo docker exec -it ${irohaContainerName} iroha-cli "\${@}"
	EOM
	chmod +x /usr/bin/iroha-cli
fi

# Get the source for the Iroha configuration files
if [ ! -d "${irohaPath}" ] ; then
	git clone --depth=1 https://github.com/hyperledger/iroha "${irohaPath}"
fi

# Create a new network for Iroha
docker network create "${irohaNetworkName}" &> /dev/null

# Run Postgres in a container
docker run -d \
	--name="${postgresContainerName}" \
	--network="${irohaNetworkName}" \
	-p ${postgresPort}:${postgresPort} \
	-e POSTGRES_PASSWORD="${postgresPassword}" \
	-e POSTGRES_USER="${postgresUsername}" \
	postgres:9.5

# Create block store volume
docker volume create "${irohaBlockstoreVolume}" &> /dev/null

# Run Iroha in a container
docker run -d \
	--name="${irohaContainerName}" \
	--network="${irohaNetworkName}" \
	-p ${irohaPort}:${irohaPort} \
	-v "${irohaPath}/example":/opt/iroha_data \
	-v "${irohaBlockStoreVolume}":/tmp/block_store \
	-e POSTGRES_HOST="${postgresContainerName}" \
	-e POSTGRES_PASSWORD="${postgresPassword}" \
	-e POSTGRES_PORT="${postgresPort}" \
	-e POSTGRES_USER="${postgresUsername}" \
	-e KEY='node0' \
	hyperledger/iroha:latest

# Run gRPC Web Proxy
grpcwebproxy \
	--allow_all_origins \
	--backend_addr="localhost:${irohaPort}" \
	--run_tls_server=false \
	--server_http_debug_port=80
