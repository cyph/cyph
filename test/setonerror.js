self.setOnerror	= function () {
	try {
		cyph.UI.VisibilityWatcher.isVisible	= true;
	}
	catch (_) {}

	self.onerror	= function (err) {
		if (err === 'Script error.') {
			return;
		}

		document.body.innerHTML	=
			'<pre style="font-size: 24px; white-space: pre-wrap;">' +
				JSON.stringify(arguments, null, '\t') +
			'</pre>'
		;
	};
};
