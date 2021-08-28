self.onmessage = e => {
	self.onmessage = undefined;
	eval(e.data);
};
