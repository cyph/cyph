import {env} from '../env';

/** Opens the specified URL in a new window. */
export const openWindow = (url: string): void => {
	/* TODO: HANDLE NATIVE */
	if (!env.isWeb) {
		return;
	}

	const a = document.createElement('a');
	a.href = url;
	a.target = '_blank';
	a.rel = 'noopener';
	a.click();
};
