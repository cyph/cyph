/* An almost-compatible replacement for visibilityjs that actually works */

function FocusVisibility () {
	let self	= this;

	self._callbacks	= [];
	self._hidden	= false;
	self.hidden		= function () { return self._hidden };
	self.change		= function (callback) { self._callbacks.push(callback) };

	function visibilityChange (isHidden) {
		return function (e) {
			if (self._hidden != isHidden) {
				self._hidden	= isHidden;

				let state	= isHidden ? 'hidden' : 'visible';

				for (let i = 0 ; i < self._callbacks.length ; ++i) {
					let callback	= self._callbacks[i];
					callback && callback(e, state);
				}
			}
		};
	}

	$(window).blur(visibilityChange(true));
	$(window).focus(visibilityChange(false));
}
