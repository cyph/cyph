import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {EnvService} from './env.service';


/**
 * Keeps track of this window.
 */
@Injectable()
export class WindowWatcherService {
	/** @ignore */
	private get windowHeight () : number {
		return Math.min(innerHeight, window.outerHeight);
	}

	/** @ignore */
	private get windowWidth () : number {
		return Math.min(window.innerWidth, window.outerWidth);
	}

	/** Window height. */
	public readonly height: BehaviorSubject<number>			= new BehaviorSubject(
		this.envService.isWeb ? this.windowHeight : 0
	);

	/** Indicates whether the window is currently visible. */
	public readonly visibility: BehaviorSubject<boolean>	= new BehaviorSubject(true);

	/** Window width. */
	public readonly width: BehaviorSubject<number>			= new BehaviorSubject(
		this.envService.isWeb ? this.windowWidth : 0
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
				on('focus', () => { this.visibility.next(true); }).
				on('blur', () => { this.visibility.next(false); })
			;
		}

		$window.on('resize', () => {
			this.height.next(this.windowHeight);
			this.width.next(this.windowWidth);
		});
	}
}
