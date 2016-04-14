/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */

import 'global/base';
import {Config} from 'cyph/config';
import {Env} from 'cyph/env';
import {Util} from 'cyph/util';
import {Elements} from 'cyph/ui/elements';


/* In WebSigned environments, can't load fonts from current origin */

if (FontsCSS) {
	Elements.body.append(
		$('<style></style>').html(
			FontsCSS.replace(
				/url\(\//g,
				'url(' + Env.homeUrl
			)
		)
	);
}


/* Translations */

if (Translations && Env.language !== Config.defaultLanguage) {
	$('[translate]').each((i: number, elem: HTMLElement) =>
		Util.translateHtml(elem)
	);
}


/* Load assets only for the current platform */

$(
	'.' +
	Env.platformString +
	'-only [deferred-src], [deferred-src].' +
	Env.platformString +
	'-only'
).each((i: number, elem: HTMLElement) => {
	const $this: JQuery	= $(elem);

	$this.attr('src', $this.attr('deferred-src'));
});


/* Mobile CSS class */

if (Env.isMobile) {
	Elements.html.addClass('mobile');
}


/* Polyfills */

if (!HTMLElement.prototype.click) {
	HTMLElement.prototype.click	= function () {
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

	if (WebSign) {
		/* In WebSigned environments, naked domain is canonical hostname */
		if (locationData.host.indexOf('www.') === 0) {
			locationData.host	= locationData.host.replace('www.', '');
		}

		/* In WebSigned environments, remove no-longer-necessary
			'unsafe-inline' from CSP after application loads */
		setTimeout(() => Elements.head.append(
			'<meta http-equiv="Content-Security-Policy" content="' +
				Env.webSignCSP.replace(/(script-src.*?) 'unsafe-inline'/g, '$1') +
			'" />'
		), 10000);
	}
});
