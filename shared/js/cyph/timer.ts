module Cyph {
	/**
	 * Generates a recurring background event and ensures that its execution
	 * won't be frozen or slowed down when the tab or window loses focus.
	 */
	export class Timer {
		private static thread: Thread;
		private static timerLock: boolean;

		private static timers: Function[]	= [];
		private static total: number		= 0;

		private static processTimers () : boolean {
			if (!Timer.timerLock) {
				Timer.timerLock	= true;

				try {
					const now: number	= Date.now();

					for (const timer of Timer.timers) {
						if (timer) {
							try {
								timer(now);
							}
							catch (err) {
								setTimeout(() => { throw err }, 0);
							}
						}
					}
				}
				finally {
					Timer.timerLock	= false;
				}
			}

			return Timer.timers.length > 0;
		}

		private static runWithThread (interval: number) : void {
			const threadHelper	= () => {
				if (Timer.processTimers()) {
					Timer.thread.postMessage({});
				}
				else {
					Timer.thread.stop();
				}
			};


			Timer.thread	= new Thread(
				(vars: any) => {
					onthreadmessage	= () =>
						setTimeout(() =>
							self.postMessage({}, undefined)
						, vars.interval)
					;
				},
				{interval},
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

		/**
		 * Stops all timers on this thread.
		 */
		public static stopAll () : void {
			Timer.timers.length	= 0;
		}


		private id: number;

		/**
		 * Stops this timer.
		 */
		public stop () : void {
			Timer.timers[this.id]	= null;

			if (--Timer.total < 1) {
				Timer.stopAll();
			}
		}

		/**
		 * @param f The current datetime is passed in on each run.
		 */
		public constructor (f: Function) {
			this.id	= Timer.total++;

			Timer.timers.push(f);

			if (this.id < 1) {
				setTimeout(() => {
					if (Env.isMainThread) {
						Timer.runWithThread(50);
					}
					else {
						Timer.runWithTimeoutLoop(50);
					}
				}, 50);
			}
		}
	}
}
