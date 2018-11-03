import {Inject, Injectable} from '@angular/core';
import * as $ from 'jquery';
import {BehaviorSubject} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';


/**
 * Keeps track of this window.
 */
@Injectable()
export class WindowWatcherService extends BaseProvider {
	/** @ignore */
	private get windowHeight () : number {
		return window.innerHeight;
	}

	/** @ignore */
	private get windowWidth () : number {
		return window.innerWidth;
	}

	/** Window height. */
	public readonly height: BehaviorSubject<number>			= new BehaviorSubject(
		this.envService.isWeb ? this.windowHeight : 0
	);

	/** Indicates whether the window is currently visible. */
	public readonly visibility: BehaviorSubject<boolean>	= new BehaviorSubject(!document.hidden);

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
		@Inject('EnvService') private readonly envService: {isMobileOS: boolean; isWeb: boolean}
	) {
		super();

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		const $window	= $(window);

		if (this.envService.isMobileOS) {
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
