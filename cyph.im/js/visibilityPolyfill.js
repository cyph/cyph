/* An almost-compatible replacement for visibilityjs that actually works */

function FocusVisibility () {
	var self	= this;

	self._callbacks	= [];
	self._hidden	= false;
	self.hidden		= function () { return self._hidden };
	self.change		= function (callback) { self._callbacks.push(callback) };

	function visibilityChange (isHidden) {
		return function (e) {
			if (self._hidden != isHidden) {
				self._hidden	= isHidden;

				var state	= isHidden ? 'hidden' : 'visible';

				for (var i in self._callbacks) {
					self._callbacks[i](e, state);
				}
			}
		};
	}

	$(window).blur(visibilityChange(true));
	$(window).focus(visibilityChange(false));
}
