# Cyph

To work locally with the Cyph repository, you'll first need to install [Docker](http://www.docker.com/).

---

If you're running either [OS X](https://docs.docker.com/installation/mac/) or [Windows](https://docs.docker.com/installation/windows/), there's some additional setup required after installing Docker.

First, on Windows, disable Hyper-V.

Next, run the following commands:

	boot2docker init
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42000,tcp,,42000,,42000"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42001,tcp,,42001,,42001"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42002,tcp,,42002,,42002"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port42003,tcp,,42003,,42003"
	VBoxManage modifyvm "boot2docker-vm" --natpf1 "tcp-port43000,tcp,,43000,,43000"
	
	boot2docker start
	# If not using the included docker.sh, you'll need to run this on each fresh boot
	
You'll then need to set the environment variables from `boot2docker start`'s output (and probably add them to your bashrc or equivalent).

---

To build for the first time, run the following command inside your local Cyph repository:

	docker build -t cyph/<branch> .

Alternatively, in Unix-like environments, you can run:

	make

To blow out all Cyph-related images/containers/processes when you're done:

	make clean

---

To start a local environment:

	docker run -d \
		-p 42000:5000 -p 42001:5001 -p 42002:5002 -p 42003:5003 -p 43000:4568 \
		-v /path/to/current/directory:/cyph \
		cyph/<branch> ./serve.sh

Alternatively, in Unix-like environments, you can run:

	./docker.sh serve

To kill it:

	./docker.sh kill

Server host: localhost (Linux) or `boot2docker ip` (OS X / Windows)

Ports:

* backend: 42000

* cyph.com: 42001

* cyph.im: 42002

* cyph.me: 42003

* SQS: 43000

---

To deploy to production, first make sure you're Ryan or Josh, then run:

	docker run -it \
		-v $HOME/.cyph:/home/gibson/.cyph \
		-v $HOME/.gitconfig:/home/gibson/.gitconfig \
		-v $HOME/.gnupg:/home/gibson/.gnupg \
		-v $HOME/.ssh:/home/gibson/.ssh \
		-v /path/to/current/directory:/cyph \
		cyph/<branch> ./deploy.sh --prod

Alternatively, in Unix-like environments, you can run:

	./docker.sh deploy --prod

---

Other available commands:

* Verify that codes compile:  
	`./docker.sh build --test`  
	or:  
	`docker run \`  
	`-v /path/to/current/directory:/cyph \`  
	`cyph/<branch> ./build.sh --test`

* Commit local changes:  
	`./docker.sh commit <comment>`  
	or:  
	`docker run \`  
	`-v $HOME/.gitconfig:/home/gibson/.gitconfig \`  
	`-v $HOME/.ssh:/home/gibson/.ssh \`  
	`-v /path/to/current/directory:/cyph \`  
	`cyph/<branch> ./commit.sh <comment>`

* Generate documentation (served in local environment at /js/docs/index.html):  
	`./docker.sh docs`  
	or:  
	`docker run \`  
	`-v /path/to/current/directory:/cyph \`  
	`cyph/<branch> ./docs.sh`

* Update libraries in client code:  
	`./docker.sh updatelibs`  
	or:  
	`docker run \`  
	`-v /path/to/current/directory:/cyph \`  
	`cyph/<branch> ./updatelibs.sh`

* Compute hash of current WebSign bootstrap:  
	`./docker.sh websignhash <project> # e.g. cyph.im`  
	or:  
	`docker run \`  
	`-v /path/to/current/directory:/cyph \`  
	`cyph/<branch> ./websignhash.sh <project>`

---

For development, the following Sublime Text plugins are recommended:

* [TypeScript](https://packagecontrol.io/packages/TypeScript)

* [GoSublime](https://packagecontrol.io/packages/GoSublime)

* [Sass](https://packagecontrol.io/packages/Sass)
