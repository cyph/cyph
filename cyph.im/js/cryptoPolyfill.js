window.crypto	= window.crypto || window.msCrypto;

if (!window.crypto || !window.Worker) {
	document.location.pathname	= '/unsupportedbrowser';
}
