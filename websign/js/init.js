if (!('crypto' in self) && 'msCrypto' in self) {
	self['crypto']	= self['msCrypto'];
}

if (!(
	'crypto' in self &&
	'getRandomValues' in self['crypto'] &&
	'Worker' in self &&
	'history' in self &&
	'pushState' in self['history'] &&
	'replaceState' in self['history'] &&
	'MutationObserver' in self
)) {
	location.pathname	= '/unsupportedbrowser';
}

if (!('subtle' in crypto) && 'webkitSubtle' in crypto) {
	crypto.subtle	= crypto['webkitSubtle'];
}

var LocalStorage;

try {
	localStorage.isPersistent	= 'true';
	LocalStorage				= localStorage;
}
catch (_) {
	LocalStorage	= LocalStorage || {};
}
