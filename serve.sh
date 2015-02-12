#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

ps ux | grep sass | awk '{print $2}' | xargs kill -9
ps ux | grep dev_appserver | awk '{print $2}' | xargs kill -9

# PORT=8080
# IFS=\\ ; for cmd in `cat dispatch.yaml | tr '\n' ' ' | perl -pe 's/.*dispatch:(.*)/\1/' | perl -pe 's/ - url: "(.*?)\/\*".*?module: (.*?) /dev_appserver.py \@\@host \1.local \@\@admin_port ADMIN_PORT \@\@port PORT \2\/*.yaml\\\\/g' | tr '-' '.' | tr '@' '-'` ; do
# 	ADMIN_PORT=$(($PORT+1))
# 	PORT=$(($PORT+2))
# 	bash -c "nohup `echo "$cmd" | sed "s/ADMIN_PORT/$ADMIN_PORT/" | sed "s/PORT/$PORT/"` &"
# done

sass --watch $1 &
sass --watch shared &
dev_appserver.py $1/*.yaml

cd "${dir}"
