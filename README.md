# Cyph

To work locally with the Cyph repository, you'll first need to install [Docker](http://www.docker.com/).

---

To build for the first time, run the following command inside your local Cyph repository:

	docker build -t cyph/<branch> .

Alternatively, in Unix-like environments, you can run:

	make

To blow out all Cyph-related images/containers/processes when you're done:

	make clean

---

To start a local environment:

	docker run --privileged=true -d \
		-p 42000:5000 -p 42001:5001 -p 42002:5002 -p 43000:4568 \
		-v /path/to/current/directory:/cyph \
		cyph/<branch> ./serve.sh

Alternatively, in Unix-like environments, you can run:

	./docker.sh serve

To kill it:

	./docker.sh kill

Server host: localhost (Linux) or docker.local (OS X / Windows)

Ports:

* backend: 42000

* cyph.com: 42001

* cyph.im: 42002

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

* Back merge changes from internal/prod to internal/master to current fork/branch:  
	`./docker.sh backmerge`  
	or:  
	`docker run \`  
	`-v $HOME/.gitconfig:/home/gibson/.gitconfig \`  
	`-v $HOME/.ssh:/home/gibson/.ssh \`  
	`-v /path/to/current/directory:/cyph \`  
	`cyph/<branch> ./backmerge.sh <comment>`

* Merge changes from internal/master to internal/prod and cyph/cyph:  
	`./docker.sh prodmerge`  
	or:  
	`docker run \`  
	`-v $HOME/.gitconfig:/home/gibson/.gitconfig \`  
	`-v $HOME/.ssh:/home/gibson/.ssh \`  
	`-v /path/to/current/directory:/cyph \`  
	`cyph/<branch> ./prodmerge.sh <comment>`

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
