import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {filter} from 'rxjs/operators/filter';
import {take} from 'rxjs/operators/take';
import {EnvService} from './env.service';


/**
 * Keeps track of this window.
 */
@Injectable()
export class WindowWatcherService {
	/** Window height. */
	public readonly height: BehaviorSubject<number>			= new BehaviorSubject(
		this.envService.isWeb ? $(window).height() : 0
	);

	/** Indicates whether the window is currently visible. */
	public readonly visibility: BehaviorSubject<boolean>	= new BehaviorSubject(true);

	/** Window width. */
	public readonly width: BehaviorSubject<number>			= new BehaviorSubject(
		this.envService.isWeb ? $(window).width() : 0
	);

	/**
	 * Waits for the visibility to change once.
	 */
	public async waitForVisibilityChange () : Promise<boolean> {
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

		await this.waitForVisibilityChange();
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const $window	= $(window);

		if (this.envService.isMobile) {
			document.addEventListener('visibilitychange', () => {
				this.visibility.next(!document.hidden);
			});
		}
		else {
			$window.
				focus(() => { this.visibility.next(true); }).
				blur(() => { this.visibility.next(false); })
			;
		}

		$window.resize(() => {
			this.height.next($window.height());
			this.width.next($window.width());
		});
	}
}
