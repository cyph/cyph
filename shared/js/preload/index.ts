/* tslint:disable:no-import-side-effect */

/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


import * as $ from 'jquery';
import {env} from '../cyph/env';
import {util} from '../cyph/util';
import './dompurify';


/* Mobile CSS class */

if (env.isMobile) {
	$(document.body).addClass('mobile');
}

/* Polyfill */

/* tslint:disable-next-line:no-unbound-method */
if (!HTMLElement.prototype.click) {
	/* tslint:disable-next-line:only-arrow-functions no-unbound-method */
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
