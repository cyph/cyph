window.crypto	= window.crypto || window.msCrypto;

if (!window.crypto) {
	document.location.pathname	= '/unsupportedbrowser';
}
