/**
 * @file Redirect browsers that don't have required capabilities.
 */


let cryptoSupported	= false;
try {
	crypto.getRandomValues(new Uint8Array(1));
	cryptoSupported	= true;
}
catch (_) {}

if (!(
	cryptoSupported &&
	'Worker' in self &&
	'history' in self &&
	'pushState' in (<any> self).history &&
	'replaceState' in (<any> self).history &&
	'MutationObserver' in self &&
	'localStorage' in self
)) {
	location.pathname	= '/unsupportedbrowser';
}
