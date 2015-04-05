/* Trigger event loops from Web Worker instead of setTimeout (http://stackoverflow.com/a/12522580/459881) */

var tickWorker, tickIntervalHalt;
var tickFunctions	= [];

function onTick (f) {
	tickFunctions.push(f);

	if (tickFunctions.length == 1) {
		var processTicksLock;

		function processTicks () {
			if (!processTicksLock) {
				processTicksLock	= true;

				var now	= Date.now();

				try {
					for (var i = 0 ; i < tickFunctions.length ; ++i) {
						var f	= tickFunctions[i];
						f && f(now);
					}
				}
				finally {
					processTicksLock	= false;
				}
			}
		}

		function processTickEventLoop (interval) {
			processTicks();

			if (!tickIntervalHalt) {
				setTimeout(function () { processTickEventLoop(interval) }, interval);
			}
		}

		function processTickWorker (interval) {
			tickWorker	= makeWorker(function () {
				var vars	= this.vars;

				onmessage	= function () {
					setTimeout(function () {
						postMessage({});
					}, vars.interval);
				};
			}, {
				interval: interval
			});

			tickWorker.onmessage	= function () {
				processTicks();
				tickWorker && tickWorker.postMessage({});
			};

			tickWorker.onmessage();
		}


		if (env.isMobile) {
			processTickEventLoop(50);
			setTimeout(function () { processTickWorker(1000) }, 3000);
		}
		else {
			processTickWorker(50);
		}
	}

	return tickFunctions.length - 1;
}

function tickOff (id) {
	if (id != undefined) {
		delete tickFunctions[id];
	}
}
