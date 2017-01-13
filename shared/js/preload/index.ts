/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


import * as jQuery from 'jquery';
(<any> self).$			= jQuery;
(<any> self).jQuery		= jQuery;
import * as angular from 'angular';
(<any> self).angular	= angular;

import {env} from '../cyph/env';
import {util} from '../cyph/util';
import './dompurify';


/* Mobile CSS class */

if (env.isMobile) {
	$(document.body).addClass('mobile');
}

/* Custom builds */

customBuild			= $('meta[name="custom-build"]').attr('content');
customBuildFavicon	= $('meta[name="custom-build-favicon"]').attr('content');

$('.custom-build-favicon').each((_: number, elem: HTMLElement) => {
	if (elem instanceof HTMLLinkElement) {
		elem.href		= customBuildFavicon || '';
	}
	else if (elem instanceof HTMLMetaElement) {
		elem.content	= customBuildFavicon || '';
	}
});

/* Polyfill */

if (!HTMLElement.prototype.click) {
	/* tslint:disable-next-line:only-arrow-functions */
	HTMLElement.prototype.click	= function (this: HTMLElement) : void {
		/* tslint:disable-next-line:no-invalid-this */
		util.triggerClick(this);
	};
}

$(async () => {
	/* Support button-links */

	$('button a').each((_: number, elem: HTMLElement) => {
		const $this: JQuery		= $(elem);
		const $button: JQuery	= $this.closest('button');

		$this.css('pointer-events', 'none');

		/* Using mouseup instead of click because of Angular Material weirdness */
		$button.on('mouseup', async () => {
			await util.sleep(500);
			elem.click();
		});
	});

	if (!env.isLocalEnv && !env.isHomeSite) {
		/* In WebSigned environments, remove no-longer-necessary
			'unsafe-inline' from CSP after application loads */
		await util.sleep(10000);
		$(document.head).append(
			`<meta http-equiv="Content-Security-Policy" content="${env.CSP}" />`
		);
	}

	/* Try again if page takes too long to initialise */
	await util.sleep(120000);
	if (!$(document.body).hasClass('load-complete')) {
		location.reload();
	}
});
