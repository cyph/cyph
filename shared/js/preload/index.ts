/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


import {Env} from '../cyph/env';
import {Elements} from '../cyph/ui/elements';
import {Util} from '../cyph/util';


/* Mobile CSS class */

if (Env.isMobile) {
	Elements.html().addClass('mobile');
}

/* Polyfill */

if (!HTMLElement.prototype.click) {
	/* tslint:disable-next-line:only-arrow-functions */
	HTMLElement.prototype.click	= function (this: HTMLElement) : void {
		/* tslint:disable-next-line:no-invalid-this */
		Util.triggerClick(this);
	};
}

$(() => {
	/* Support button-links */

	$('button > a').each((i: number, elem: HTMLElement) => {
		const $this: JQuery		= $(elem);
		const $button: JQuery	= $this.parent();

		$this.css('pointer-events', 'none');

		/* Using mouseup instead of click because of Angular Material weirdness */
		$button.on('mouseup', () => setTimeout(() => elem.click(), 500));
	});

	if (!Env.isLocalEnv && !Env.isHomeSite) {
		/* In WebSigned environments, naked domain is canonical hostname */
		if (locationData.host.indexOf('www.') === 0) {
			locationData.host	= locationData.host.replace('www.', '');
		}

		/* In WebSigned environments, remove no-longer-necessary
			'unsafe-inline' from CSP after application loads */
		setTimeout(
			() => Elements.head().append(
				`<meta http-equiv="Content-Security-Policy" content="${Env.CSP}" />`
			),
			10000
		);
	}

	/* Try again if page takes too long to initialise */
	setTimeout(
		() => {
			if (!Elements.html().hasClass('load-complete')) {
				location.reload();
			}
		},
		60000
	);
});


export const loaded	= true;
