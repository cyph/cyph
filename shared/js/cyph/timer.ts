module Cyph {
	export class Timer {
		private static thread: Thread;
		private static timerLock: boolean;

		private static timers: Function[]	= [];
		private static total: number		= 0;

		private static processTimers () : boolean {
			if (!Timer.timerLock) {
				Timer.timerLock	= true;

				try {
					let now: number	= Date.now();

					for (let timer of Timer.timers) {
						if (timer) {
							try {
								timer(now);
							}
							catch (e) {
								setTimeout(() => { throw e }, 0);
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
			let threadHelper	= () => {
				if (Timer.processTimers()) {
					Timer.thread.postMessage({});
				}
				else {
					Timer.thread.stop();
				}
			};


			Timer.thread	= new Thread((vars: any, postMessage: Function) => {
				onthreadmessage	= () =>
					setTimeout(() =>
						postMessage({})
					, vars.interval)
				;
			},
			{
				interval: interval
			}, threadHelper);

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

		public stop () : void {
			Timer.timers[this.id]	= null;

			if (--Timer.total < 1) {
				Timer.stopAll();
			}
		}

		public constructor (f: Function) {
			this.id	= Timer.total++;

			Timer.timers.push(f);

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
	}
}
