#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


type="${1}"

ngModel=''
if [ "${type}" == 'component' ] && [ "${2}" == '--ng-model' ] ; then
	ngModel=true
	shift
fi

name="${2}"


if \
	[ "${type}" != 'component' -a "${type}" != 'resolver' -a "${type}" != 'service' ] || \
	[ "${name}" == '' ] \
; then
	echo 'Usage: docker.js generate [component|resolver|service] MyNewThing'
	exit 1
fi

files=''
class="${name}$(echo "${type}" | perl -pe 's/^(.)/\u$1/g')"
selector="$(echo "${name}" | perl -pe 's/([A-Z])/-\l$1/g' | sed 's|^-||g')"
genericDescription="$(echo "${selector}" | sed 's|-| |g')"


if [ "${type}" == 'component' ] ; then

mkdir -p shared/js/cyph/components

echo "<div>${name}</div>" > shared/templates/${selector}.html
echo "<Label text='${name}'></Label>" > shared/templates/native/${selector}.html
echo "@import '../mixins';" > shared/css/components/${selector}.scss
echo "@import '../mixins';" > shared/css/native/components/${selector}.scss

if [ "${ngModel}" ] ; then cat > shared/js/cyph/components/${selector}.component.ts << EOM
import {Component} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for ${genericDescription} UI.
 */
@Component({
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: ${class}
		}
	],
	selector: 'cyph-${selector}',
	styleUrls: ['../../../css/components/${selector}.scss'],
	templateUrl: '../../../templates/${selector}.html'
})
export class ${class} implements ControlValueAccessor {
	/** Change event callback. */
	private onChange: (value: string) => void	= () => {};

	/** Indicates whether input is disabled. */
	public isDisabled: boolean					= false;

	/** Touch event callback. */
	public onTouched: () => void				= () => {};

	/** Value. */
	public value: string						= '';

	/** @inheritDoc */
	public registerOnChange (f: (value: string) => void) : void {
		this.onChange	= f;
	}

	/** @inheritDoc */
	public registerOnTouched (f: () => void) : void {
		this.onTouched	= f;
	}

	/** @inheritDoc */
	public setDisabledState (isDisabled: boolean) : void {
		if (this.isDisabled !== isDisabled) {
			this.isDisabled	= isDisabled;
		}
	}

	/** @inheritDoc */
	public writeValue (value: string) : void {
		if (this.value !== value) {
			this.value	= value;
		}
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
EOM
else cat > shared/js/cyph/components/${selector}.component.ts << EOM
import {Component} from '@angular/core';
import {StringsService} from '../services/strings.service';


/**
 * Angular component for ${genericDescription} UI.
 */
@Component({
	selector: 'cyph-${selector}',
	styleUrls: ['../../../css/components/${selector}.scss'],
	templateUrl: '../../../templates/${selector}.html'
})
export class ${class} {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
EOM
fi

read -r -d '' files <<- EOM
	shared/templates/${selector}.html
	shared/templates/native/${selector}.html
	shared/css/components/${selector}.scss
	shared/css/native/components/${selector}.scss
	shared/js/cyph/components/${selector}.component.ts
EOM


elif [ "${type}" == 'resolver' ] ; then

mkdir -p shared/js/cyph/resolvers

file="shared/js/cyph/resolvers/${selector}-resolver.service.ts"

cat > ${file} << EOM
import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs/Observable';


/**
 * Angular resolver for ${genericDescription}.
 */
@Injectable()
export class ${class}Service implements Resolve<Balls> {
	public resolve (
		route: ActivatedRouteSnapshot,
		state: RouterStateSnapshot
	) : Observable<Balls> {

	}

	constructor (
		/** @ignore */
		private readonly router: Router
	) {}
}
EOM

files="${file}"


elif [ "${type}" == 'service' ] ; then

mkdir -p shared/js/cyph/services

file="shared/js/cyph/services/${selector}.service.ts"

cat > ${file} << EOM
import {Injectable} from '@angular/core';


/**
 * Angular service for ${genericDescription}.
 */
@Injectable()
export class ${class} {
	constructor () {}
}
EOM

files="${file}"


else

echo fak u gooby
exit 1

fi


git add ${files}
chmod 777 ${files}
git commit -S -m "generate ${class}" ${files}
