/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


/// <reference path="../cyph/base.ts" />
/// <reference path="../cyph/ui/elements.ts" />


/* In WebSigned environments, can't load fonts from current origin */

if (FontsCSS) {
	Cyph.UI.Elements.body.append(
		$('<style></style>').html(
			FontsCSS.replace(
				/url\(\//g,
				'url(' + Cyph.Env.homeUrl
			)
		)
	);
}


/* Translations */

if (Translations && Cyph.Env.language !== Cyph.Config.defaultLanguage) {
	$('[translate]').each((i: number, elem: HTMLElement) =>
		Cyph.Util.translateHtml(elem)
	);
}


/* Load assets only for the current platform */

$(
	'.' +
	Cyph.Env.platformString +
	'-only [deferred-src], [deferred-src].' +
	Cyph.Env.platformString +
	'-only'
).each((i: number, elem: HTMLElement) => {
	const $this: JQuery	= $(elem);

	$this.attr('src', $this.attr('deferred-src'));
});


/* Mobile CSS class */

if (Cyph.Env.isMobile) {
	Cyph.UI.Elements.html.addClass('mobile');
}


/* Polyfills */

if (!HTMLElement.prototype.click) {
	HTMLElement.prototype.click	= function () {
		Cyph.Util.triggerClick(this);
	};
}

try {
	Object.keys({});
}
catch (_) {
	Object.keys	= o => {
		const keys: any[]	= [];
		for (const k in o) {
			keys.push(k);
		}
		return keys;
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

	/* In WebSigned environments, remove no-longer-necessary
		'unsafe-inline' from CSP after application loads */

	if (WebSign) {
		setTimeout(() => Cyph.UI.Elements.head.append(
			'<meta http-equiv="Content-Security-Policy" content="' +
				Cyph.Env.webSignCSP.replace(/(script-src.*?) 'unsafe-inline'/g, '$1') +
			'" />'
		), 10000);
	}
});
