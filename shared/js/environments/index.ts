/**
 * @file Handle custom builds.
 */


import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {Environment} from '../proto';
import {environment} from './environment';


if (customBuildBase64) {
	try {
		environment.customBuild	= Environment.CustomBuild.decode(
			potassiumUtil.fromBase64(customBuildBase64)
		);
	}
	catch {}
	finally {
		customBuildBase64	= undefined;
	}
}

accountPrimaryTheme	= true;
accountRoot			= 'account';

if (typeof window === 'object') {
	if (environment.customBuild) {
		for (const k of Object.keys(Object.getPrototypeOf(environment.customBuild))) {
			const o	= (<any> environment.customBuild)[k];
			if (ArrayBuffer.isView(o) && o.byteLength < 1) {
				(<any> environment.customBuild)[k]	= undefined;
			}
		}

		if (environment.customBuild.config.accountsOnly) {
			accountRoot	= '';
		}

		if (environment.customBuild.config.backgroundColor) {
			accountPrimaryTheme	= false;

			for (const elem of Array.from<HTMLMetaElement>(document.querySelectorAll(
				'head meta[name="theme-color"],' +
				'head meta[name="msapplication-TileColor"]'
			))) {
				elem.content	= environment.customBuild.config.backgroundColor;
			}

			for (const elem of Array.from(document.querySelectorAll(
				'head link[rel="mask-icon"]'
			))) {
				elem.setAttribute('color', environment.customBuild.config.backgroundColor);
			}
		}

		if (environment.customBuild.config.title) {
			for (const elem of Array.from(document.getElementsByTagName('title'))) {
				elem.textContent	= environment.customBuild.config.title;
			}
		}

		if (environment.customBuild.css && document.head) {
			accountPrimaryTheme	= false;
			const style			= document.createElement('style');
			style.textContent	= environment.customBuild.css;
			document.head.appendChild(style);
		}

		if (environment.customBuild.favicon) {
			document.body.classList.add('cobranded');

			const faviconURI	=
				`data:image/png;base64,${potassiumUtil.toBase64(environment.customBuild.favicon)}`
			;

			for (const elem of Array.from(document.querySelectorAll(
				'head link[type="image/png"],' +
				'head meta[name="msapplication-TileImage"]'
			))) {
				if (elem instanceof HTMLLinkElement) {
					elem.href		= faviconURI;
				}
				else if (elem instanceof HTMLMetaElement) {
					elem.content	= faviconURI;
				}
			}
		}

		if (environment.customBuild.config.telehealth) {
			accountPrimaryTheme	= false;
			document.body.classList.add('telehealth');
		}
	}
}


export {environment};
