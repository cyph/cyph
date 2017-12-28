import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {filter} from 'rxjs/operators/filter';
import {take} from 'rxjs/operators/take';
import {EnvService} from './env.service';


/**
 * Keeps track of this window's visibility to user.
 */
@Injectable()
export class VisibilityWatcherService {
	/** Indicates whether the window is currently visible. */
	public readonly visibility: BehaviorSubject<boolean>	= new BehaviorSubject(true);

	/** @ignore */
	private trigger (isVisible: boolean) : void {
		if (this.visibility.value === isVisible) {
			return;
		}

		this.visibility.next(isVisible);
	}

	/**
	 * Waits for the visibility to change once.
	 */
	public async waitForChange () : Promise<boolean> {
		const initialValue	= this.visibility.value;
		return this.visibility.pipe(filter(value => value !== initialValue), take(1)).toPromise();
	}

	/**
	 * Waits until the window is visible.
	 */
	public async waitUntilVisible () : Promise<void> {
		if (this.visibility.value) {
			return;
		}

		await this.waitForChange();
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (this.envService.isMobile) {
			document.addEventListener('visibilitychange', () => {
				this.trigger(!document.hidden);
			});
		}
		else {
			$(window).
				focus(() => { this.trigger(true); }).
				blur(() => { this.trigger(false); })
			;
		}
	}
}
