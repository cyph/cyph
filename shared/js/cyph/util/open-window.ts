import {env} from '../env';


/** Opens the specified URL in a new window. */
export const openWindow	= (url: string) : void => {
	/* TODO: HANDLE NATIVE */
	if (!env.isWeb) {
		return;
	}

	const w	= open();

	if (!w) {
		return;
	}

	/* tslint:disable-next-line:no-null-keyword */
	w.opener	= null;

	w.location.replace(url);
};
