/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


import {env} from '../cyph/env';
import {elements} from '../cyph/ui/elements';
import {util} from '../cyph/util';


/* Mobile CSS class */

if (env.isMobile) {
	elements.html().addClass('mobile');
}

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
		/* In WebSigned environments, naked domain is canonical hostname */
		if (locationData.host.indexOf('www.') === 0) {
			locationData.host	= locationData.host.replace('www.', '');
		}

		/* In WebSigned environments, remove no-longer-necessary
			'unsafe-inline' from CSP after application loads */
		await util.sleep(10000);
		elements.head().append(
			`<meta http-equiv="Content-Security-Policy" content="${env.CSP}" />`
		);
	}

	/* Try again if page takes too long to initialise */
	await util.sleep(60000);
	if (!elements.html().hasClass('load-complete')) {
		location.reload();
	}
});


export const loaded	= true;
