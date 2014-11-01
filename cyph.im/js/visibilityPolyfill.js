/* An almost-compatible replacement for visibilityjs that actually works */

window.FocusVisibility	= {
	_callbacks: [],
	_hidden: false,
	hidden: functon () { return this._hidden },
	change: function (callback) { this._callbacks.push(callback) }
};

(function () {
	function visibilityChange (isHidden) {
		return function () {
			if (FocusVisibility._hidden != isHidden) {
				FocusVisibility._hidden	= isHidden;

				var state	= isHidden ? 'hidden' : 'visible';

				for (var i in FocusVisibility._callbacks) {
					FocusVisibility._callbacks[i](state);
				}
			}
		};
	}

	$(window).blur(visibilityChange(true));
	$(window).focus(visibilityChange(false));
}());
