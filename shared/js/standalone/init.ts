/* tslint:disable:no-import-side-effect */

/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */


import {NavigationEnd, Router} from '@angular/router';
import * as $ from 'jquery';
import {env} from '../cyph/env';
import {staticRouter} from '../cyph/util/static-services';
import {triggerClick} from '../cyph/util/trigger-click';
import {sleep} from '../cyph/util/wait';


/* Mobile CSS class */

if (env.isMobile) {
	$(document.body).addClass('mobile');
}

if (env.isCordova) {
	$(document.body).addClass('cordova');
}

/* Workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=821876 */

if (!(env.isMacOS && env.isChrome && env.chromeVersion >= 65)) {
	$(document.body).addClass('enable-drop-shadow');
}

/* Cordova back button support */

if (env.isCordova) {
	let router: Router|undefined;
	const routingHistory: string[]	= [];

	staticRouter.then(staticRouterValue => {
		router	= staticRouterValue;

		router.events.subscribe(e => {
			if (e instanceof NavigationEnd) {
				routingHistory.push(e.url);
			}
		});
	});

	(<any> self).onbackbutton	= async () => {
		for (const selector of [
			'.overlay.clickable',
			'.cdk-overlay-pane.mat-tooltip-panel',
			'.mat-drawer-backdrop.mat-drawer-shown',
			'.cdk-overlay-backdrop.cdk-overlay-backdrop-showing'
		]) {
			const clickableOverlay	= document.querySelector(selector);

			if (clickableOverlay instanceof HTMLElement) {
				clickableOverlay.click();
				return;
			}
		}

		if (env.isAndroid && !(<any> self).androidBackbuttonReady) {
			(<any> self).plugins.appMinimize.minimize();
		}
		else if (router && routingHistory.length >= 2) {
			routingHistory.pop();
			router.navigateByUrl(routingHistory.pop() || '');
		}
	};
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

if (location.hash && location.hash.endsWith('/')) {
	location.hash	= location.hash.slice(0, -1);
}

$(async () => {
	if (!env.isHomeSite) {
		if (!env.isLocalEnv) {
			/* In WebSigned environments, perform CSP Meta-Hardening */
			await sleep(10000);
			$(document.head).append(
				`<meta http-equiv="Content-Security-Policy" content="${env.CSP}" />`
			);
		}
		else if (location.pathname !== '/') {
			location.replace('/#' + location.pathname.slice(1));
		}
	}

	/* Try again if page takes too long to initialize */
	await sleep(120000);
	if (!$(document.body).hasClass('load-complete')) {
		location.reload();
	}
});
