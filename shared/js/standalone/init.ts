/* tslint:disable:no-import-side-effect */

/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */

import * as $ from 'jquery';
import {env} from '../cyph/env';
import {triggerClick} from '../cyph/util/input';
import {sleep} from '../cyph/util/wait';

/** Handle redirection in local env before ServiceWorker is initialized */

if (env.isLocalEnv && location.pathname !== '/') {
	location.replace('/#' + location.pathname.slice(1));
}

/* Mobile CSS class */

/* tslint:disable-next-line:rxjs-no-ignored-subscription */
env.isMobile.subscribe(isMobile => {
	document.body.classList.toggle('mobile', isMobile);
});

document.body.classList.toggle('cordova', env.isCordova);

/* Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=821876 */

document.body.classList.toggle(
	'disable-drop-shadow',
	env.isMacOS &&
		env.isChrome &&
		env.chromeVersion >= 65 &&
		env.chromeVersion < 68
);

/* Cordova back button support */

if (env.isCordova) {
	(<any> self).onbackbutton = async () => {
		for (const selector of [
			'.overlay.clickable',
			'.cdk-overlay-pane.mat-tooltip-panel',
			'.cdk-overlay-backdrop.cdk-overlay-backdrop-showing',
			'.mat-drawer-backdrop.mat-drawer-shown'
		]) {
			const clickableOverlay = document.querySelector(selector);

			if (clickableOverlay instanceof HTMLElement) {
				clickableOverlay.click();
				return;
			}
		}

		if (env.isAndroid && !(<any> self).androidBackbuttonReady) {
			(<any> self).plugins.appMinimize.minimize();
		}
		else {
			history.back();
		}
	};
}

/* Handle beforeunload */

window.addEventListener('beforeunload', e => {
	if (beforeUnloadMessage !== undefined) {
		e.returnValue = beforeUnloadMessage;
	}
});

/* Polyfill */

/* tslint:disable-next-line:no-unbound-method */
if (!HTMLElement.prototype.click) {
	/* tslint:disable-next-line:only-arrow-functions no-unbound-method */
	HTMLElement.prototype.click = function (this: HTMLElement) : void {
		/* tslint:disable-next-line:no-invalid-this */
		triggerClick(this);
	};
}

if (location.hash && location.hash.endsWith('/')) {
	location.hash = location.hash.slice(0, -1);
}

$(async () => {
	if (!env.isHomeSite && !env.isLocalEnv && document.head) {
		/* In WebSigned environments, perform CSP Meta-Hardening */
		await sleep(10000);
		$(document.head).append(
			`<meta http-equiv="Content-Security-Policy" content="${env.CSP}" />`
		);
	}

	/* Try again if page takes too long to initialize */
	await sleep(120000);
	if (!document.body.classList.contains('load-complete')) {
		location.reload();
	}
});
