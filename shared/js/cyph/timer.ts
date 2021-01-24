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
	private isStopped: boolean = false;

	/** @ignore */
	private startPromise?: Promise<void>;

	/** Indicates whether timer is counting up (as opposed to down). */
	public readonly countUp: boolean;

	/** Indicates whether timer's count has completed. */
	public isComplete: Subject<boolean> = new BehaviorSubject<boolean>(false);

	/** Indicates whether timer's count has started. */
	public isStarted: Subject<boolean> = new BehaviorSubject<boolean>(false);

	/** Duration in milliseconds. */
	public time: number;

	/** Human-readable string indicating remaining time. */
	public timestamp: Subject<string>;

	/** @ignore */
	private getTimestamp (time: number) : string {
		const hours = Math.floor(time / 3600000);
		const minutes = Math.floor((time % 3600000) / 60000);
		const seconds = Math.floor(((time % 3600000) % 60000) / 1000);

		this.includeHours =
			this.includeHours || time >= 3600000 || this.time >= 3600000;
		this.includeMinutes =
			this.includeMinutes || time >= 60000 || this.time >= 60000;

		return this.includeHours ?
			`${hours}:${`0${minutes}`.slice(-2)}:${`0${seconds}`.slice(-2)}` :
		this.includeMinutes ?
			`${minutes}:${`0${seconds}`.slice(-2)}` :
			`${seconds}`;
	}

	/** Extends the countdown duration or increases recorded countup duration. */
	public addTime (milliseconds: number) : void {
		this.time += milliseconds;

		if (this.endTime) {
			this.endTime += milliseconds;
		}
	}

	/**
	 * Initiates count.
	 * @returns Promise that resolves when count finishes or is stopped.
	 */
	public async start () : Promise<void> {
		if (this.isStopped) {
			return;
		}

		if (this.startPromise) {
			return this.startPromise;
		}

		this.isStarted.next(true);

		this.startPromise = new Promise<void>(async (resolve, reject) => {
			await sleep(1000);

			const startTime = await getTimestamp();

			if (!this.countUp) {
				this.endTime = startTime + this.time;
			}
			else if (this.countupDuration) {
				this.endTime = startTime + this.countupDuration;
			}

			watchTimestamp(250)
				.pipe(
					map(timestamp => {
						if (this.countUp) {
							timestamp += this.time;
						}

						return {
							continue:
								!this.isStopped &&
								(this.endTime === undefined ||
									this.endTime > timestamp),
							next: this.getTimestamp(
								this.countUp ?
									timestamp - startTime :
									(this.endTime || 0) - timestamp
							)
						};
					}),
					takeWhile(o => o.continue),
					map(o => o.next)
				)
				/* eslint-disable-next-line @typescript-eslint/tslint/config */
				.subscribe(
					s => {
						this.timestamp.next(s);
					},
					reject,
					async () => {
						if (!this.countUp) {
							this.timestamp.next(
								this.includeHours ?
									'0:00:00' :
								this.includeMinutes ?
									'0:00' :
									'0'
							);
						}

						resolve();
						await sleep(1000);
						this.isComplete.next(true);
					}
				);
		});

		return this.startPromise;
	}

	/** Stops count. */
	public stop () : void {
		this.isStopped = true;
		this.isComplete.next(true);
	}

	constructor (
		countdown?: number,

		autostart?: boolean,

		/** Number of ms before countup stops. */
		private readonly countupDuration?: number,

		/** Include minutes in timestamp string. */
		private includeMinutes: boolean = false,

		/** Include hours in timestamp string. */
		private includeHours: boolean = false
	) {
		if (countdown === undefined) {
			this.countUp = true;
			this.time = 0;
		}
		else {
			this.countUp = false;
			this.time = countdown;
		}

		this.timestamp = new BehaviorSubject(this.getTimestamp(this.time));

		if (autostart) {
			this.start();
		}
	}
}
