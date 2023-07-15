if (!self.navigator) {
	self.navigator = self.navigator;
}

navigator.clipboard = {};

navigator.clipboard.writeText = function (text) {
	return new Promise(function (resolve, reject) {
		cordova.plugins.clipboard.copy({data: text}, resolve, reject);
	});
};

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
