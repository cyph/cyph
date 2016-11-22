/**
 * @file Custom jQuery plugins.
 */


/**
 * Calculate absolute coordinates of the boundaries of this element.
 */
/* tslint:disable-next-line:only-arrow-functions */
$.fn.bounds	= function () : ({
	bottom: number;
	left: number;
	right: number;
	top: number;
}) {
	 /* tslint:disable-next-line:no-invalid-this */
	const $this: JQuery	= $(this);

	const bounds	= $this.offset();

	return {
		bottom: bounds.top + $this.outerHeight(),
		left: bounds.left,
		right: bounds.left + $this.outerWidth(),
		top: bounds.top
	};
};

/**
 * Calculate number of pixels user has scrolled relative to this element.
 */
/* tslint:disable-next-line:only-arrow-functions */
$.fn.scrollPosition	= function () : number {
	/* tslint:disable-next-line:no-invalid-this */
	const $this: JQuery	= $(this);

	return $this[0].scrollHeight -
	(
		$this[0].scrollTop +
		$this[0].clientHeight
	);
};
