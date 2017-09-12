#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


type="${1}"
name="${2}"


if [ "${type}" != 'component' -a "${type}" != 'service' ] || [ "${name}" == '' ] ; then
	echo 'Usage: docker.js generate [component|service] MyNewThing'
	exit 1
fi

files=''
class="${name}$(echo "${type}" | perl -pe 's/^(.)/\u$1/g')"
selector="$(echo "${name}" | perl -pe 's/([A-Z])/-\l$1/g' | sed 's|^-||g')"
genericDescription="$(echo "${selector}" | sed 's|-| |g')"


if [ "${type}" == 'component' ] ; then

echo "<div>${name}</div>" > shared/templates/${selector}.html
echo "<Label text='${name}'></Label>" > shared/templates/native/${selector}.html
echo "@import '../mixins';" > shared/css/components/${selector}.scss
echo "@import '../mixins';" > shared/css/native/components/${selector}.scss

cat > shared/js/cyph/components/${selector}.component.ts << EOM
import {Component} from '@angular/core';


/**
 * Angular component for ${genericDescription} UI.
 */
@Component({
	selector: 'cyph-${selector}',
	styleUrls: ['../../../css/components/${selector}.scss'],
	templateUrl: '../../../templates/${selector}.html'
})
export class ${class} {
	constructor () {}
}
EOM

read -r -d '' files <<- EOM
	shared/templates/${selector}.html
	shared/templates/native/${selector}.html
	shared/css/components/${selector}.scss
	shared/css/native/components/${selector}.scss
	shared/js/cyph/components/${selector}.component.ts
EOM

else

cat > shared/js/cyph/services/${selector}.service.ts << EOM
import {Injectable} from '@angular/core';


/**
 * Angular service for ${genericDescription}.
 */
@Injectable()
export class ${class} {
	constructor () {}
}
EOM

files="shared/js/cyph/services/${selector}.service.ts"

fi


git add ${files}
chmod 777 ${files}
git commit -S -m "generate ${class}" ${files}
