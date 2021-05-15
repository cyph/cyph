self.setOnerror = function () {
	self.onerror = function (err) {
		if (err === 'Script error.') {
			return;
		}

		document.body.innerHTML =
			'<pre style="font-size: 24px; white-space: pre-wrap;">' +
			JSON.stringify(arguments, null, '\t') +
			'</pre>';
	};
};
