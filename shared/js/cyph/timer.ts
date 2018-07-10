import {BehaviorSubject, Subject} from 'rxjs';
import {map, takeWhile} from 'rxjs/operators';
import {getTimestamp, watchTimestamp} from './util/time';
import {sleep} from './util/wait';


/**
 * Represents a countdown timer.
 */
export class Timer {
	/** @ignore */
	private endTime?: number;

	/** @ignore */
	private includeHours: boolean	= false;

	/** @ignore */
	private includeMinutes: boolean	= false;

	/** @ignore */
	private isStopped: boolean		= false;

	/** @ignore */
	private startPromise?: Promise<void>;

	/** Indicates whether timer's countdown has completed. */
	public isComplete: Subject<boolean>	= new BehaviorSubject(false);

	/** Indicates whether timer's countdown has started. */
	public isStarted: Subject<boolean>	= new BehaviorSubject(false);

	/** Human-readable string indicating remaining time. */
	public timestamp: Subject<string>	= new BehaviorSubject(
		this.getTimestamp(this.countdown)
	);

	/** @ignore */
	private getTimestamp (timeRemaining: number) : string {
		const hours		= Math.floor(timeRemaining / 3600000);
		const minutes	= Math.floor((timeRemaining % 3600000) / 60000);
		const seconds	= Math.floor(((timeRemaining % 3600000) % 60000) / 1000);

		this.includeHours	= this.includeHours || this.countdown >= 3600000;
		this.includeMinutes	= this.includeMinutes || this.countdown >= 60000;

		return this.includeHours ?
			`${hours}:${`0${minutes}`.slice(-2)}:${`0${seconds}`.slice(-2)}` :
			this.includeMinutes ?
				`${minutes}:${`0${seconds}`.slice(-2)}` :
				`${seconds}`
		;
	}

	/** Extends the countdown duration. */
	public addTime (milliseconds: number) : void {
		this.countdown += milliseconds;

		if (this.endTime) {
			this.endTime += milliseconds;
		}
	}

	/**
	 * Initiates countdown.
	 * @returns Promise that resolves when countdown finishes or is stopped.
	 */
	public async start () : Promise<void> {
		if (this.isStopped) {
			return;
		}
		else if (this.startPromise) {
			return this.startPromise;
		}

		this.isStarted.next(true);

		this.startPromise	= new Promise(async (resolve, reject) => {
			await sleep(1000);

			this.endTime	= (await getTimestamp()) + this.countdown;

			watchTimestamp(250).pipe(
				map(timestamp => ({
					continue:
						!this.isStopped &&
						this.endTime !== undefined &&
						this.endTime > timestamp
					,
					next: this.getTimestamp((this.endTime || 0) - timestamp)
				})),
				takeWhile(o => o.continue),
				map(o => o.next)
			).subscribe(
				s => { this.timestamp.next(s); },
				reject,
				async () => {
					this.timestamp.next(
						this.includeHours ?
							'0:00:00' :
							this.includeMinutes ?
								'0:00' :
								'0'
					);

					resolve();
					await sleep(1000);
					this.isComplete.next(true);
				}
			);
		});

		return this.startPromise;
	}

	/** Stops countdown. */
	public stop () : void {
		this.isStopped	= true;
		this.isComplete.next(true);
	}

	constructor (
		/** Countdown duration in milliseconds. */
		public countdown: number,

		autostart?: boolean
	) {
		if (autostart) {
			this.start();
		}
	}
}
