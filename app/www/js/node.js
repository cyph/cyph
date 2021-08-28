self.cordovaNodeJS = new Promise((resolve, reject) => {
	self.cordovaNodeJSResolve = {reject, resolve};
});

self.cordovaNodeJSInit = () => {
	nodejs.start(
		'index.js',
		err => {
			if (err) {
				self.cordovaNodeJSResolve.reject(err);
				return;
			}

			self.cordovaNodeJSResolve.resolve(
				Comlink.wrap({
					addEventListener: (_TYPE, listener, _OPTIONS) => {
						nodejs.channel.setListener(listener);
					},
					postMessage: (message, _TRANSFER) => {
						nodejs.channel.send(message);
					}
				})
			);
		},
		{redirectOutputToLogcat: false}
	);
};
