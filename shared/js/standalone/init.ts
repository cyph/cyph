/* tslint:disable:no-import-side-effect */

/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


import * as $ from 'jquery';
import {env} from '../cyph/env';
import {triggerClick} from '../cyph/util/trigger-click';
import {sleep} from '../cyph/util/wait';


/* Mobile CSS class */

if (env.isMobile) {
	$(document.body).addClass('mobile');
}

/* Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=821876 */

if (!(env.isMacOS && env.isChrome && env.chromeVersion >= 65)) {
	$(document.body).addClass('enable-drop-shadow');
}

/* Handle beforeunload */

window.addEventListener('beforeunload', e => {
	if (beforeUnloadMessage !== undefined) {
		e.returnValue	= beforeUnloadMessage;
	}
});

/* Polyfill */

/* tslint:disable-next-line:no-unbound-method */
if (!HTMLElement.prototype.click) {
	/* tslint:disable-next-line:only-arrow-functions no-unbound-method */
	HTMLElement.prototype.click	= function (this: HTMLElement) : void {
		/* tslint:disable-next-line:no-invalid-this */
		triggerClick(this);
	};
}

$(async () => {
	if (!env.environment.local && !env.isHomeSite) {
		/* In WebSigned environments, perform CSP Meta-Hardening */
		await sleep(10000);
		$(document.head).append(
			`<meta http-equiv="Content-Security-Policy" content="${env.CSP}" />`
		);
	}

	/* Try again if page takes too long to initialize */
	await sleep(120000);
	if (!$(document.body).hasClass('load-complete')) {
		location.reload();
	}
});
