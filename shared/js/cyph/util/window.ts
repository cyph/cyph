import {env} from '../env';
import {MaybePromise} from '../maybe-promise-type';
import {filterUndefined} from './filter/base';

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
		if (
			(<any> self).cordova?.plugins?.browsertab &&
			(url.startsWith('https://') || url.startsWith('http://'))
		) {
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
		const remote = (() => {
			try {
				return cordovaRequire('@electron/remote');
			}
			catch {
				return cordovaRequire('electron').remote;
			}
		})();
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
		const remote = (() => {
			try {
				return cordovaRequire('@electron/remote');
			}
			catch {
				return cordovaRequire('electron').remote;
			}
		})();
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
