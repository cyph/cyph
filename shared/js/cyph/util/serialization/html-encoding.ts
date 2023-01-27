const textarea =
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	typeof document !== 'undefined' ?
		document.createElement('textarea') :
		undefined;

/** Decodes an HTML-encoded string. */
export const decodeHTML = (s: string) : string => {
	if (!textarea) {
		throw new Error('Not implemented.');
	}

	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	textarea.innerHTML = s;
	return textarea.value;
};
