window.crypto	= window.crypto || window.msCrypto;

if (!window.crypto || !window.Worker || !history || !history.pushState || !history.replaceState || !localStorage) {
	document.location.pathname	= '/unsupportedbrowser';
}
