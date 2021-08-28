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

			const listeners = new Set();
			nodejs.channel.on('message', message => {
				for (const listener of listeners) {
					listener({data: message});
				}
			});

			self.cordovaNodeJSResolve.resolve(
				Comlink.wrap({
					addEventListener: (_TYPE, listener, _OPTIONS) => {
						listeners.add(listener);
					},
					postMessage: (message, _TRANSFER) => {
						nodejs.channel.send(message);
					},
					removeEventListener: (_TYPE, listener, _OPTIONS) => {
						listeners.delete(listener);
					}
				})
			);
		},
		{redirectOutputToLogcat: false}
	);
};
