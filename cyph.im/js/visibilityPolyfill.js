/* An almost-compatible replacement for visibilityjs that actually works */

window.FocusVisibility	= {
	_callbacks: [],
	_hidden: false,
	hidden: function () { return this._hidden },
	change: function (callback) { this._callbacks.push(callback) }
};

(function () {
	function visibilityChange (isHidden) {
		return function (e) {
			if (FocusVisibility._hidden != isHidden) {
				FocusVisibility._hidden	= isHidden;

				var state	= isHidden ? 'hidden' : 'visible';

				for (var i in FocusVisibility._callbacks) {
					FocusVisibility._callbacks[i](e, state);
				}
			}
		};
	}

	$(window).blur(visibilityChange(true));
	$(window).focus(visibilityChange(false));
}());
