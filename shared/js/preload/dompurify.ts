/**
 * @file DOMPurify href URI scheme whitelist hook, copied from
 * https://github.com/cure53/DOMPurify/blob/master/demos/hooks-scheme-whitelist.html.
 */


(() => {


/* Allowed URI schemes */
const whitelist: string[]	= ['http', 'https', 'ftp'];

/* Build fitting regex */
const regex: RegExp			= RegExp('^(' + whitelist.join('|') + '):', 'gim');

/* Add a hook to enforce URI scheme whitelist */
DOMPurify.addHook('afterSanitizeAttributes', (node: HTMLElement) => {
	/* Build an anchor to map URLs to */
	const anchor: HTMLAnchorElement	= document.createElement('a');

	/* Check all href attributes for validity */
	if (node.hasAttribute('href')) {
		anchor.href	= node.getAttribute('href');
		if (!anchor.protocol.match(regex)) {
			node.removeAttribute('href');
		}
	}

	/* Check all action attributes for validity */
	if (node.hasAttribute('action')) {
		anchor.href	= node.getAttribute('action');
		if (!anchor.protocol.match(regex)) {
			node.removeAttribute('action');
		}
	}

	/* Check all xlink:href attributes for validity */
	if (node.hasAttribute('xlink:href')) {
		anchor.href	= node.getAttribute('xlink:href');
		if (!anchor.protocol.match(regex)) {
			node.removeAttribute('xlink:href');
		}
	}

	return node;
});


})();
