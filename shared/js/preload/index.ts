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
		util.triggerClick(this);
	};
}

$(async () => {
	if (!env.isLocalEnv && !env.isHomeSite) {
		/* In WebSigned environments, perform CSP Meta-Hardening */
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
