/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


/// <reference path="../cyph/base.ts" />
/// <reference path="../cyph/ui/elements.ts" />


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
	let $this: JQuery	= $(elem);

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

if (!Object.keys) {
	Object.keys	= o => {
		let keys: any[]	= [];
		for (let k in o) {
			keys.push(k);
		}
		return keys;
	};
}



$(() => {
	/* Support button-links */

	$('button > a').each((i: number, elem: HTMLElement) => {
		let $this: JQuery	= $(elem);
		let $button: JQuery	= $this.parent();

		$this.css('pointer-events', 'none');

		/* Using mouseup instead of click because of Angular Material weirdness */
		$button.on('mouseup', () => setTimeout(() => elem.click(), 500));
	});

	/* Temporary workaround for Angular Material bug */

	if (Cyph.Env.isMobile) {
		let previousCoordinates: {[coordinates: string] : boolean}	= {};

		Cyph.UI.Elements.window.click(e => {
			let coordinates: string	=
				Math.floor(Cyph.Util.getValue(e, 'clientX', 0)) +
				',' +
				Math.floor(Cyph.Util.getValue(e, 'clientY', 0))
			;

			if (coordinates === '0,0') {
				return;
			}

			if (previousCoordinates[coordinates]) {
				e.preventDefault();
				e.stopPropagation();
			}
			else {
				try {
					previousCoordinates[coordinates]	= true;
				}
				finally {
					setTimeout(() =>
						previousCoordinates[coordinates]	= null
					, 2000);
				}
			}
		});
	}
});
