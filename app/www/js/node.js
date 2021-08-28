self.cordovaNodeJS = new Promise(function (resolve, reject) {
	self.cordovaNodeJSResolve = {reject: reject, resolve: resolve};
});

self.cordovaNodeJSInit = function () {
	nodejs.start(
		'index.js',
		function (err) {
			if (err) {
				self.cordovaNodeJSResolve.reject(err);
				return;
			}

			self.cordovaNodeJSResolve.resolve(
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
};
