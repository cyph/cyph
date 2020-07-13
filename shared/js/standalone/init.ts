/**
 * @file Miscellaneous setup tasks performed before running main
 * routine of all Web projects.
 */

import * as $ from 'jquery';

/* TODO: Handle this properly instead of relying on side effects */
/* eslint-disable-next-line @typescript-eslint/tslint/config */
import '../environments';

import {env} from '../cyph/env';
import {triggerClick} from '../cyph/util/input';
import {sleep} from '../cyph/util/wait';
import {reloadWindow} from '../cyph/util/window';

/* Temporary workaround to get current users onto new scheduler */

if (location.host === 'cyph.healthcare') {
	location.host = 'cyph.app';
}
if (location.host === 'staging.cyph.healthcare') {
	location.host = 'staging.cyph.app';
}

/* Handle redirection in local env before ServiceWorker is initialized */

if (env.isLocalEnv && location.pathname !== '/') {
	location.replace('/#' + location.pathname.slice(1));
}

/* Mobile CSS class */

/* eslint-disable-next-line @typescript-eslint/tslint/config */
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
			'.sidenav-overlay'
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

if (env.isCordovaDesktop && typeof cordovaRequire === 'function') {
	const {remote} = cordovaRequire('electron');

	remote.getCurrentWindow().on('close', (e: any) => {
		if (beforeUnloadMessage === undefined || confirm(beforeUnloadMessage)) {
			return;
		}

		e.preventDefault();
	});
}
else {
	window.addEventListener(env.isSafari ? 'pagehide' : 'beforeunload', e => {
		if (beforeUnloadMessage !== undefined) {
			e.returnValue = beforeUnloadMessage;
		}
	});
}

/* In-app purchase setup */

const store = (<any> self).store;

if (
	env.inAppPurchasesSupported &&
	env.isCordovaMobileIOS &&
	typeof store?.register === 'function'
) {
	store.register([
		{
			alias: 'Monthly Platinum',
			id: 'MonthlyPlatinum',
			type: store.PAID_SUBSCRIPTION
		}
	]);

	store.refresh();
}

/* Polyfill */

/* eslint-disable-next-line @typescript-eslint/unbound-method */
if (!HTMLElement.prototype.click) {
	/* eslint-disable-next-line @typescript-eslint/unbound-method, prefer-arrow/prefer-arrow-functions */
	HTMLElement.prototype.click = function (this: HTMLElement) : void {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		triggerClick(this);
	};
}

if (!env.isCordova && location.hash && location.hash.endsWith('/')) {
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
		reloadWindow();
	}
});
