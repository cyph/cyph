import memoize from 'lodash-es/memoize';
import {env} from '../env';
import {MaybePromise} from '../maybe-promise-type';
import {filterUndefined} from './filter';

const isCordovaBrowserTabAvailable = memoize(
	async () =>
		!!(<any> self).cordova?.plugins?.browsertab &&
		(await new Promise<any>((resolve, reject) => {
			(<any> self).cordova?.plugins?.browsertab.isAvailable(
				resolve,
				reject
			);
		}).catch(() => false)) === true
);

/** Opens the specified URL in a new window. */
export const openWindow = async (
	url: string | MaybePromise<string | undefined>[],
	sameWindow: boolean = false
) : Promise<void> => {
	/* TODO: HANDLE NATIVE */
	if (!env.isWeb) {
		return;
	}

	if (url instanceof Array) {
		url = filterUndefined(await Promise.all(url)).join('');
	}

	if (env.isCordovaDesktop) {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		window.open(
			url.replace(
				/^#/,
				`file://${((<any> self).__dirname || '').replace(
					/\\/g,
					'/'
				)}/index.html#`
			)
		);
		return;
	}

	try {
		if (await isCordovaBrowserTabAvailable()) {
			await new Promise<void>((resolve, reject) => {
				(<any> self).cordova.plugins.browsertab.openUrl(
					url,
					resolve,
					reject
				);
			});
			return;
		}
	}
	catch {}

	if (sameWindow && !env.isCordova) {
		location.href = url;
		return;
	}

	const a = document.createElement('a');
	a.href = url;
	a.target = '_blank';
	a.rel = 'noopener';
	a.click();
};

/** Reloads window, or performs equivalent behavior depending on platform. */
export const reloadWindow = () : void => {
	if (env.isCordovaDesktop && typeof cordovaRequire === 'function') {
		const {remote} = cordovaRequire('electron');
		remote.app.relaunch();
		remote.app.exit();
	}
	else if (env.isWeb) {
		location.reload();
	}
	else {
		/* TODO: HANDLE NATIVE */
	}
};

/** Closes window, or performs equivalent behavior depending on platform. */
export const closeWindow = () : void => {
	if (env.isCordovaDesktop && typeof cordovaRequire === 'function') {
		const {remote} = cordovaRequire('electron');
		remote.app.exit();
	}
	else if (env.isWeb) {
		reloadWindow();

		if ((<any> self).androidBackbuttonReady) {
			(<any> self).plugins.appMinimize.minimize();
		}
	}
	else {
		/* TODO: HANDLE NATIVE */
	}
};
