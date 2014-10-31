/* An almost-compatible replacement for visibilityjs that actually works */

window.Visibility	= {
	_callbacks: [],
	hidden: false,
	change: function (callback) { this._callbacks.push(callback) }
};

(function () {
	function visibilityChange (isHidden) {
		return function () {
			if (Visibility.hidden != isHidden) {
				Visibility.hidden	= isHidden;

				for (var i in Visibility._callbacks) {
					Visibility._callbacks[i](isHidden);
				}
			}
		};
	}

	$(window).blur(visibilityChange(true));
	$(window).focus(visibilityChange(false));
}());
