#!/bin/bash


eval "$(parseArgs \
	--opt-bool ng-model \
	--pos type \
	--pos name \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..


type="${_arg_type}"

ngModel=''
if [ "${type}" == 'component' ] && [ "${_arg_ng_model}" == 'on' ] ; then
	ngModel=true
fi

name="${_arg_name}"


if \
	( \
		[ "${type}" != 'component' ] && \
		[ "${type}" != 'directive' ] && \
		[ "${type}" != 'resolver' ] && \
		[ "${type}" != 'service' ] \
	) || \
	[ "${name}" == '' ]
then
	echo 'Usage: run.js generate [component|directive|resolver|service] MyNewThing'
	exit 1
fi

files=''
class="${name}$(echo "${type}" | perl -pe 's/^(.)/\u$1/g')"
selector="$(echo "${name}" | perl -pe 's/([A-Z])/-\l$1/g' | sed 's|^-||g')"
genericDescription="$(echo "${selector}" | sed 's|-| |g')"


if [ "${type}" == 'component' ] ; then

dir="shared/js/cyph/components/${selector}"
mkdir -p ${dir}

echo "<div>${name}</div>" > ${dir}/${selector}.component.html
echo "<Label text='${name}'></Label>" > ${dir}/${selector}.component.native.html
echo "@import '../../../../css/mixins';" > ${dir}/${selector}.component.scss
echo "@import '../../../../css/mixins';" > ${dir}/${selector}.component.native.scss
echo "export * from './${selector}.component';" > ${dir}/index.ts

if [ "${ngModel}" ] ; then cat > ${dir}/${selector}.component.ts << EOM
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for ${genericDescription} UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		{
			multi: true,
			provide: NG_VALUE_ACCESSOR,
			useExisting: ${class}
		}
	],
	selector: 'cyph-${selector}',
	styleUrls: ['./${selector}.component.scss'],
	templateUrl: './${selector}.component.html'
})
export class ${class} extends BaseProvider implements ControlValueAccessor {
	/** Change event callback. */
	private onChange: (value: string) => void = () => {};

	/** Indicates whether input is disabled. */
	public isDisabled: boolean = false;

	/** Touch event callback. */
	public onTouched: () => void = () => {};

	/** Value. */
	public value: string = '';

	/** @inheritDoc */
	public registerOnChange (f: (value: string) => void) : void {
		this.onChange = f;
	}

	/** @inheritDoc */
	public registerOnTouched (f: () => void) : void {
		this.onTouched = f;
	}

	/** @inheritDoc */
	public setDisabledState (isDisabled: boolean) : void {
		if (this.isDisabled !== isDisabled) {
			this.isDisabled = isDisabled;
		}
	}

	/** @inheritDoc */
	public writeValue (value: string) : void {
		if (this.value !== value) {
			this.value = value;
		}
	}

	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
EOM
else cat > ${dir}/${selector}.component.ts << EOM
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BaseProvider} from '../../base-provider';
import {StringsService} from '../../services/strings.service';


/**
 * Angular component for ${genericDescription} UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-${selector}',
	styleUrls: ['./${selector}.component.scss'],
	templateUrl: './${selector}.component.html'
})
export class ${class} extends BaseProvider {
	constructor (
		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
EOM
fi

files="${dir}"


elif [ "${type}" == 'directive' ] ; then

mkdir -p shared/js/cyph/directives

file="shared/js/cyph/directives/${selector}.directive.ts"

cat > ${file} << EOM
import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import {BaseProvider} from '../base-provider';


/**
 * Angular directive for ${genericDescription}.
 */
@Directive({
	selector: '[cyph${name}]'
})
export class ${class} extends BaseProvider implements OnInit {
	/** @inheritDoc */
	public ngOnInit () : void {}

	constructor (
		/** @ignore */
		private readonly elementRef: ElementRef,

		/** @ignore */
		private readonly renderer: Renderer2
	) {
		super();
	}
}
EOM

files="${file}"


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
	) : Observable<Balls> {}

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
import {BaseProvider} from '../base-provider';


/**
 * Angular service for ${genericDescription}.
 */
@Injectable()
export class ${class} extends BaseProvider {
	constructor () {
		super();
	}
}
EOM

files="${file}"


else

fail 'fak u gooby'

fi


git add ${files}
chmod -R 777 ${files}
git commit -S -m "generate ${class}" ${files}
git add ${files}
