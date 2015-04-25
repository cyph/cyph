$.fn.bounds	= function () {
	let bounds: JQueryCoordinates	= this.offset();

	return {
		top: bounds.top,
		left: bounds.left,
		bottom: bounds.top + this.outerHeight(),
		right: bounds.left + this.outerWidth()
	};
};


$.fn.scrollPosition	= function () {
	return this[0].scrollHeight -
	(
		this[0].scrollTop +
		this[0].clientHeight
	);
};
