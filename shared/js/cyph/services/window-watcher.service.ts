import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {map, filter, take} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {toBehaviorSubject} from '../util/flatten-observable';
import {observableAll} from '../util/observable-all';

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
	public readonly height: BehaviorSubject<number> = new BehaviorSubject(
		this.envService.isWeb ? this.windowHeight : 0
	);

	/** Indicates whether the window is currently visible. */
	public readonly visibility: BehaviorSubject<boolean> = new BehaviorSubject(
		typeof document === 'undefined' || !document.hidden
	);

	/** Indicates whether the window aspect ratio is widescreen. */
	public readonly widescreen: BehaviorSubject<boolean>;

	/** Window width. */
	public readonly width: BehaviorSubject<number> = new BehaviorSubject(
		this.envService.isWeb ? this.windowWidth : 0
	);

	/**
	 * Waits for the visibility to change once.
	 * @param visible If specified, waits until changes to this state.
	 */
	public async waitForVisibilityChange (
		visible?: boolean
	) : Promise<boolean> {
		const initialValue = this.visibility.value;
		const newValue = await this.visibility
			.pipe(
				filter(value => value !== initialValue),
				take(1)
			)
			.toPromise();

		if (typeof visible === 'boolean' && newValue !== visible) {
			return this.waitForVisibilityChange(visible);
		}

		return newValue;
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
		@Inject('EnvService')
		private readonly envService: {isMobileOS: boolean; isWeb: boolean}
	) {
		super();

		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			this.widescreen = new BehaviorSubject<boolean>(false);
			return;
		}

		if (this.envService.isMobileOS) {
			document.addEventListener('visibilitychange', () => {
				this.visibility.next(!document.hidden);
			});
		}
		else {
			window.addEventListener('focus', () => {
				this.visibility.next(true);
			});

			window.addEventListener('blur', () => {
				this.visibility.next(false);
			});
		}

		window.addEventListener('resize', () => {
			this.height.next(this.windowHeight);
			this.width.next(this.windowWidth);
		});

		const isWidescreen = (height: number, width: number) =>
			height * 3 < width * 2;

		this.widescreen = toBehaviorSubject(
			observableAll([this.height, this.width]).pipe(
				map(([height, width]) => isWidescreen(height, width))
			),
			isWidescreen(this.height.value, this.width.value),
			this.subscriptions
		);
	}
}
