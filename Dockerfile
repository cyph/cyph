FROM debian:bullseye

RUN apt-get -y --allow-downgrades update
RUN apt-get -y --allow-downgrades install \
	apt-transport-https \
	apt-utils \
	ca-certificates \
	curl \
	gnupg \
	lsb-release \
	software-properties-common

RUN echo '\
	if [ -f /cyph/commands/.bashrc ] ; then \
		source /cyph/commands/.bashrc; \
	elif [ -f ~/getlibs/commands/.bashrc ] ; then \
		source ~/getlibs/commands/.bashrc; \
	fi \
' >> /.bashrc

RUN echo 'gibson ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN useradd -ms /bin/bash gibson
RUN mkdir -p /home/gibson
RUN cp -f /.bashrc /home/gibson/.bashrc
RUN cp -f /.bashrc /root/.bashrc
RUN rm -rf /home/gibson/.gnupg 2> /dev/null
RUN chmod 700 /home/gibson/.bashrc
USER gibson
ENV HOME /home/gibson

#SETUP:RUN mkdir -p ~/getlibs/commands ~/getlibs/native ~/getlibs/shared/lib/js
#SETUP:BASE64_FILES
#SETUP:RUN chmod -R 777 ~/getlibs
#SETUP:RUN ~/getlibs/commands/updatedockerimage.sh
#SETUP:RUN ~/getlibs/commands/getlibs.sh
#SETUP:RUN ~/getlibs/commands/dockerpostmake.sh
#CIRCLECI:RUN sudo mkdir /cyph
#CIRCLECI:RUN sudo chmod 777 /cyph

WORKDIR /cyph/commands
EXPOSE 9005 9876 31337 42000 42001 42002 42003 42004 44000
CMD /bin/bash
