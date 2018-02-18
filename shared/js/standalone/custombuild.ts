/**
 * @file Handle custom builds.
 */


import * as $ from 'jquery';
import {potassiumUtil} from '../cyph/crypto/potassium/potassium-util';
import {Environment} from '../cyph/proto';
import {environment} from '../environments/environment';


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

accountRoot	= 'account';

if (environment.customBuild) {
	if (environment.customBuild.config.accountsOnly) {
		accountRoot	= '';
	}

	if (environment.customBuild.config.backgroundColor) {
		$('head').find(
			'meta[name="theme-color"],' +
			'meta[name="msapplication-TileColor"]'
		).
			attr('content', environment.customBuild.config.backgroundColor)
		;
	}

	if (environment.customBuild.config.telehealth) {
		$(document.body).addClass('telehealth');
	}

	if (environment.customBuild.config.title) {
		$('title').text(environment.customBuild.config.title);
	}

	if (environment.customBuild.css) {
		const style			= document.createElement('style');
		style.textContent	= environment.customBuild.css;
		document.head.appendChild(style);
	}

	if (environment.customBuild.favicon && environment.customBuild.favicon.length > 0) {
		const faviconURI	=
			`data:image/png;base64,${potassiumUtil.toBase64(environment.customBuild.favicon)}`
		;

		$('head').find(
			'link[type="image/png"],' +
			'meta[name="msapplication-TileImage"]'
		).each((_, elem) => {
			if (elem instanceof HTMLLinkElement) {
				elem.href		= faviconURI;
			}
			else if (elem instanceof HTMLMetaElement) {
				elem.content	= faviconURI;
			}
		});
	}
}
