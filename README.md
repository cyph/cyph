# Cyph

Initial setup on OS X and Windows:

	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42000,tcp,,42000,,42000"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42001,tcp,,42001,,42001"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42002,tcp,,42002,,42002"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42003,tcp,,42003,,42003"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port43000,tcp,,43000,,43000"

To build for the first time:

	docker build -t cyph/<branch> .

To start local environment:

	docker run -d \
		-p 42000:8080 -p 42001:8081 -p 42002:8082 -p 42003:8083 -p 43000:4568 \
		-v /path/to/current/directory:/cyph \
		cyph/<branch> ./serve.sh

Host: localhost (Linux) or `$(boot2docker ip)` (OS X / Windows)

Ports:

* backend: 42000

* cyph.com: 42001

* cyph.im: 42002

* cyph.me: 42003

* SQS: 43000

To deploy to production, first make sure you're Ryan or Josh, then run:

	docker run \
		-v /home/gibson/.gnupg:$HOME/.gnupg \
		-v /home/gibson/.cyph:$HOME/.cyph \
		-v /path/to/current/directory:/cyph \
		cyph/<branch> ./deploy.sh --prod

Other available commands:

* Check whether codes compile:

	docker run -v /path/to/current/directory:/cyph cyph/<branch> ./build.sh --test

* Commit local changes:

	docker run -v /path/to/current/directory:/cyph cyph/<branch> ./commit.sh <comment>

* Update libraries in client code:

	docker run -v /path/to/current/directory:/cyph cyph/<branch> ./updatelibs.sh

* Compute hash of current WebSign bootstrap:

	docker run -v /path/to/current/directory:/cyph cyph/<branch> ./websignhash.sh cyph.im

---

In Unix-like environments, the following alternative commands are provided for convenience:

* `make`

* `make clean`

* `./docker.sh serve`

* `./docker.sh deploy [--prod]`

* `./docker.sh build --test`

* `./docker.sh commit <comment>`

* `./docker.sh updatelibs`

* `./docker.sh websignhash <project>`

---

For development, the following Sublime Text plugins are recommended:

* [ArcticTypescript](https://packagecontrol.io/packages/ArcticTypescript)

* [GoSublime](https://packagecontrol.io/packages/GoSublime)

* [Sass](https://packagecontrol.io/packages/Sass)
