self.nodeThread = new Promise((resolve, reject) => {
	self.resolveNodeThread = {reject: reject, resolve: resolve};
});

document.addEventListener('deviceready', function () {
	nodejs.start(
		'index.js',
		function (err) {
			if (err) {
				self.resolveNodeThread.reject(err);
				return;
			}

			self.resolveNodeThread.resolve(
				Comlink.wrap({
					addEventListener: function (_TYPE, listener, _OPTIONS) {
						nodejs.channel.setListener(listener);
					},
					postMessage: function (message, _TRANSFER) {
						nodejs.channel.send(message);
					}
				})
			);
		},
		{redirectOutputToLogcat: false}
	);
});
