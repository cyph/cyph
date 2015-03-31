window.crypto	= window.crypto || window.msCrypto;

if (
	!window.crypto ||
	!window.crypto.getRandomValues ||
	!window.Worker ||
	!window.history ||
	!window.history.pushState ||
	!window.history.replaceState ||
	!window.localStorage
) {
	document.location.pathname	= '/unsupportedbrowser';
}
