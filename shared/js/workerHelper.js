/* http://stackoverflow.com/a/10372280/459881 */
self.onmessage	= function(e) {
	self.onmessage	= null;
	eval(e.data);
};
