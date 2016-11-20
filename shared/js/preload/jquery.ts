/**
 * @file Custom jQuery plugins.
 */


/**
 * Calculate absolute coordinates of the boundaries of this element.
 */
$.fn.bounds	= function () : ({
	bottom: number;
	left: number;
	right: number;
	top: number;
}) {
	 /* tslint:disable-next-line:no-invalid-this */
	const $elem: JQuery	= this;

	const bounds	= $elem.offset();

	return {
		bottom: bounds.top + $elem.outerHeight(),
		left: bounds.left,
		right: bounds.left + $elem.outerWidth(),
		top: bounds.top
	};
};

/**
 * Calculate number of pixels user has scrolled relative to this element.
 */
$.fn.scrollPosition	= function () : number {
	/* tslint:disable-next-line:no-invalid-this */
	const $elem: JQuery	= this;

	return $elem[0].scrollHeight -
	(
		$elem[0].scrollTop +
		$elem[0].clientHeight
	);
};
