self.onmessage = function (e) {
	self.onmessage = undefined;
	eval(e.data);
};
