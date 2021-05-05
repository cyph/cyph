const textarea =
	typeof document !== 'undefined' ?
		document.createElement('textarea') :
		undefined;

/** Decodes an HTML-encoded string. */
export const decodeHTML = (s: string) : string => {
	if (!textarea) {
		throw new Error('Not implemented.');
	}

	textarea.innerHTML = s;
	return textarea.value;
};
