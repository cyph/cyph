import {util} from './util';


/**
 * Represents a countdown timer.
 */
export class Timer {
	/** @ignore */
	private endTime: number;

	/** @ignore */
	private includeHours: boolean;

	/** @ignore */
	private includeMinutes: boolean;

	/** @ignore */
	private isStopped: boolean;

	/** Indicates whether timer's countdown has completed. */
	public isComplete: boolean;

	/** Human-readable string indicating remaining time. */
	public timestamp: string;

	/** @ignore */
	private updateTimestamp (timeRemaining: number) : void {
		const hours		= Math.floor(timeRemaining / 3600000);
		const minutes	= Math.floor((timeRemaining % 3600000) / 60000);
		const seconds	= Math.floor(((timeRemaining % 3600000) % 60000) / 1000);

		this.includeHours	= this.includeHours || this.countdown >= 3600000;
		this.includeMinutes	= this.includeMinutes || this.countdown >= 60000;

		this.timestamp	= this.includeHours ?
			`${hours}:${`0${minutes}`.slice(-2)}:${`0${seconds}`.slice(-2)}` :
			this.includeMinutes ?
				`${minutes}:${`0${seconds}`.slice(-2)}` :
				`${seconds}`
		;
	}

	/**
	 * Extends the countdown duration.
	 * @param milliseconds
	 */
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

		this.endTime	= util.timestamp() + this.countdown;

		for (
			let timeRemaining = this.countdown;
			timeRemaining > 0;
			timeRemaining = this.endTime - util.timestamp()
		) {
			if (this.isStopped) {
				return;
			}

			this.updateTimestamp(timeRemaining);
			await util.sleep(500);

			if (timeRemaining < 1) {
				await util.sleep(1000);
			}
		}

		this.isComplete	= true;
		this.timestamp	= this.includeHours ?
			'0:00:00' :
			this.includeMinutes ?
				'0:00' :
				'0'
		;
	}

	/** Stops countdown. */
	public stop () : void {
		this.isComplete	= true;
		this.isStopped	= true;
	}

	constructor (
		/** Countdown duration in milliseconds. */
		public countdown: number,

		autostart?: boolean
	) {
		this.updateTimestamp(this.countdown);

		if (autostart) {
			this.start();
		}
	}
}
