import {BehaviorSubject, Subject} from 'rxjs';
import {staticNgZone} from './util/static-services';
import {getTimestamp} from './util/time';
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

	/** Indicates whether timer's countdown has completed. */
	public isComplete: Subject<boolean>	= new BehaviorSubject(false);

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

		await (await staticNgZone).runOutsideAngular(async () => {
			await sleep(1000);

			this.endTime	= (await getTimestamp()) + this.countdown;

			for (
				let timeRemaining = this.countdown;
				timeRemaining > 0;
				timeRemaining = this.endTime - (await getTimestamp())
			) {
				if (this.isStopped) {
					return;
				}

				this.timestamp.next(this.getTimestamp(timeRemaining));
				await sleep();

				if (timeRemaining < 1) {
					await sleep(1000);
				}
			}

			this.isComplete.next(true);
			this.timestamp.next(
				this.includeHours ?
					'0:00:00' :
					this.includeMinutes ?
						'0:00' :
						'0'
			);
		});
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
