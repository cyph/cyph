#!/bin/bash

source ~/.bashrc

echo -e '\n\n\ncaching SSH and GPG keys\n'
eval "$(ssh-agent)"
ssh-add ~/.ssh/id_rsa
mkdir ~/tmpgit
cd ~/tmpgit
git init
touch balls
git add balls
git commit -S -a -m test
cd
rm -rf ~/tmpgit
