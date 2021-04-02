/**
 * @file Redirect browsers that don't have required capabilities.
 */

let cryptoSupported = false;
try {
	/* eslint-disable-next-line @typescript-eslint/tslint/config */
	crypto.getRandomValues(new Uint8Array(1));
	cryptoSupported = true;
}
catch {}

if (
	!(
		cryptoSupported &&
		'Promise' in self &&
		'Worker' in self &&
		'history' in self &&
		'pushState' in (<any> self).history &&
		'replaceState' in (<any> self).history &&
		'MutationObserver' in self &&
		typeof document.createElement('div').style.grid === 'string'
	)
) {
	location.pathname = '/unsupportedbrowser';
}
