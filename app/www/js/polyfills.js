self.Notification = function (title, options) {
	cordova.plugins.notification.local.schedule({
		color: '#8B62D9',
		foreground: true,
		text: options.body,
		title: title
	});
};

self.Notification.requestPermission = function () {
	return new Promise(function (resolve) {
		cordova.plugins.notification.local.requestPermission(function (
			granted
		) {
			resolve(granted ? 'granted' : 'denied');
		});
	});
};
