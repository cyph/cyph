/* Get strings */

if (typeof strings != 'undefined') {
	Object.keys(strings).forEach(function (k) {
		strings[k]	= $('meta[name="' + k + '"]').attr('content').replace(/\s+/g, ' ').trim();
	});
}



/* Load assets only for the current platform */

$(
	'.' +
	Env.platformString +
	'-only [deferred-src], [deferred-src].' +
	Env.platformString +
	'-only'
).each(function () {
	var $this	= $(this);
	$this.attr('src', $this.attr('deferred-src'));
});



/* Custom event handlers */

$('[on-enterpress]').each(function () {
	var $this			= $(this);
	var enterpressOnly	= $this.attr('enterpress-only');

	if (!enterpressOnly || enterpressOnly == Env.platformString) {
		var onenterpress	= $this.attr('on-enterpress');

		$this.keypress(function (e) {
			if (e.keyCode == 13 && !e.shiftKey) {
				if (onenterpress) {
					eval(onenterpress);
					e.preventDefault();
				}
			}
		});
	}
});

['click', 'change'].forEach(function (eventName) {
	var attribute	= 'on-' + eventName;

	$('[' + attribute + ']').each(function () {
		var $this	= $(this);

		$this.on(eventName, function () {
			eval($this.attr(attribute));
		});
	});
});



/* Support button-links */

$('button > a').each(function () {
	var $this	= $(this);
	var $button	= $this.parent();

	$this.css('pointer-events', 'none');

	/* Using mouseup instead of click because of Angular Material weirdness */
	$button.on('mouseup', function () {
		setTimeout(function () {
			$this[0].click();
		}, 500);
	});
});



/* Temporary workaround for Angular Material bug */

if (Env.isMobile) {
	var previousCoordinates	= {};

	$(window).click(function (e) {
		var coordinates	= Math.floor(e.clientX || 0) + ',' + Math.floor(e.clientY || 0);

		if (coordinates == '0,0') {
			return;
		}

		if (previousCoordinates[coordinates]) {
			e.preventDefault();
			e.stopPropagation();
		}
		else {
			try {
				previousCoordinates[coordinates]	= true;
			}
			finally {
				setTimeout(function () {
					delete previousCoordinates[coordinates];
				}, 2000);
			}
		}
	});
}



/* Polyfill for weird browsers */

if (!HTMLElement.prototype.click) {
	HTMLElement.prototype.click	= function () {
		var e	= document.createEvent('MouseEvents');
		e.initEvent('click', true, true);
		this.dispatchEvent(e);
	}
}
