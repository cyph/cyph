/// <reference path="env.ts" />
/// <reference path="globals.ts" />
/// <reference path="thread.ts" />


class Timer {
	private static thread: Thread;
	private static timerLock: boolean;

	private static timers: Function[]	= [];

	private static processTimers () : boolean {
		if (!Timer.timerLock) {
			Timer.timerLock	= true;

			try {
				let exception: any;

				let now	= Date.now();

				for (let i = 0 ; i < Timer.timers.length ; ++i) {
					let f	= Timer.timers[i];

					if (f) {
						try {
							f(now);
						}
						catch (e) {
							exception	= e;
						}
					}
				}

				if (exception) {
					throw exception;
				}
			}
			finally {
				Timer.timerLock	= false;
			}
		}

		return Timer.timers.length > 0;
	}

	private static runWithThread (interval: number) : void {
		function threadHelper () : void {
			if (Timer.processTimers()) {
				Timer.thread.postMessage({});
			}
			else {
				Timer.thread.stop();
			}
		}


		Timer.thread	= new Thread(
			(vars, postMessage) =>
				onmessage	= () =>
					setTimeout(() =>
						postMessage({})
					, vars.interval)
			,
			{
				interval: interval
			},
			threadHelper
		);

		threadHelper();
	}

	private static runWithTimeoutLoop (interval: number) : void {
		if (Timer.processTimers()) {
			setTimeout(() =>
				Timer.runWithTimeoutLoop(interval)
			, interval);
		}
	}

	public static stopAll () : void {
		Timer.timers.length	= 0;
	}


	private id: number;

	public constructor (f: Function) {
		this.id	= Timer.timers.push(f) - 1;

		if (this.id < 1) {
			if (!Env.isMainThread) {
				Timer.runWithTimeoutLoop(50);
			}
			else if (Env.isMobile) {
				Timer.runWithTimeoutLoop(50);
				setTimeout(() => Timer.runWithThread(1000), 3000);
			}
			else {
				Timer.runWithThread(50);
			}
		}
	}

	public stop () : void {
		delete Timer.timers[this.id];
	}
}
