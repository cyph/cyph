import {Env} from 'env';


/**
 * Generates a recurring background event.
 */
export class Timer {
	private static timerLock: boolean;

	private static timers: Function[]	= [];
	private static total: number		= 0;

	private static processTimers () : boolean {
		if (!Timer.timerLock) {
			Timer.timerLock	= true;

			try {
				const now: number	= Date.now();

				for (let timer of Timer.timers) {
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
			setTimeout(() => Timer.runWithTimeoutLoop(50), 50);
		}
	}
}
