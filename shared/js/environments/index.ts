/**
 * @file Handle custom builds.
 */

import $ from 'jquery';
import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {Environment} from '../proto';
import {environment} from './environment';

if (customBuildBase64) {
	try {
		environment.customBuild = Environment.CustomBuild.decode(
			potassiumUtil.fromBase64(customBuildBase64)
		);
	}
	catch {
	}
	finally {
		customBuildBase64 = undefined;
	}
}

accountPrimaryTheme = true;
burnerRoot = 'burner';

if (
	environment.customBuild &&
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	typeof $ === 'function' &&
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	typeof window === 'object'
) {
	for (const k of Object.keys(
		Object.getPrototypeOf(environment.customBuild)
	)) {
		const o = (<any> environment.customBuild)[k];
		if (ArrayBuffer.isView(o) && o.byteLength < 1) {
			(<any> environment.customBuild)[k] = undefined;
		}
	}

	if (environment.customBuild.config.burnerOnly) {
		burnerRoot = '';
	}

	if (environment.customBuild.config.backgroundColor) {
		accountPrimaryTheme = false;

		$('head')
			.find(
				'meta[name="theme-color"],' +
					'meta[name="msapplication-TileColor"]'
			)
			.attr('content', environment.customBuild.config.backgroundColor);

		$('head link[rel="mask-icon"]').attr(
			'color',
			environment.customBuild.config.backgroundColor
		);
	}

	if (environment.customBuild.config.title) {
		$('title').text(environment.customBuild.config.title);
	}

	if (environment.customBuild.css && document.head) {
		accountPrimaryTheme = false;
		const style = document.createElement('style');
		style.textContent = environment.customBuild.css;
		document.head.appendChild(style);
	}

	if (environment.customBuild.favicon) {
		$(document.body).addClass('cobranded');

		const faviconURI = `data:image/png;base64,${potassiumUtil.toBase64(
			environment.customBuild.favicon
		)}`;

		$('head')
			.find(
				'link[type="image/png"],' +
					'meta[name="msapplication-TileImage"]'
			)
			.each((_, elem) => {
				if (elem instanceof HTMLLinkElement) {
					elem.href = faviconURI;
				}
				else if (elem instanceof HTMLMetaElement) {
					elem.content = faviconURI;
				}
			});
	}

	if (environment.customBuild.config.telehealth) {
		accountPrimaryTheme = false;
		$(document.body).addClass('telehealth');
	}
}

export {environment};
