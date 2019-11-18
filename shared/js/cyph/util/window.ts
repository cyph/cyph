import {env} from '../env';

/** Opens the specified URL in a new window. */
export const openWindow = (url: string) : void => {
	/* TODO: HANDLE NATIVE */
	if (!env.isWeb) {
		return;
	}

	if (env.isCordovaDesktop) {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		window.open(url);
		return;
	}

	if (
		(<any> self).cordova &&
		(<any> self).cordova.plugins &&
		(<any> self).cordova.plugins.InAppBrowser
	) {
		(<any> self).cordova.plugins.InAppBrowser.open(
			url,
			'_blank',
			'location=no'
		);
	}

	const a = document.createElement('a');
	a.href = url;
	a.target = '_blank';
	a.rel = 'noopener';
	a.click();
};

/** Reloads window, or performs equivalent behavior depending on platform. */
export const reloadWindow = () : void => {
	if (env.isCordovaDesktop) {
		window.close();
	}
	else if (env.isWeb) {
		location.reload();
	}
	else {
		/* TODO: HANDLE NATIVE */
	}
};
