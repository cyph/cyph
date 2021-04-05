import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {map, filter, take} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {toBehaviorSubject} from '../util/flatten-observable';

/**
 * Keeps track of this window.
 */
@Injectable()
export class WindowWatcherService extends BaseProvider {
	/** Window dimensions. */
	public readonly dimensions = new BehaviorSubject<{
		height: number;
		width: number;
	}>({
		height: this.windowHeight,
		width: this.windowWidth
	});

	/** Window height. */
	public readonly height = toBehaviorSubject(
		this.dimensions.pipe(map(({height}) => height)),
		this.dimensions.value.height,
		this.subscriptions
	);

	/** Indicates whether the window is currently visible. */
	public readonly visibility = new BehaviorSubject<boolean>(
		typeof document === 'undefined' || !document.hidden
	);

	/** Indicates whether the window aspect ratio is widescreen. */
	public readonly widescreen = toBehaviorSubject(
		this.dimensions.pipe(
			map(({height, width}) => this.isWidescreen(height, width))
		),
		this.isWidescreen(this.windowHeight, this.windowWidth),
		this.subscriptions
	);

	/** Window width. */
	public readonly width = toBehaviorSubject(
		this.dimensions.pipe(map(({width}) => width)),
		this.dimensions.value.width,
		this.subscriptions
	);

	/** @ignore */
	private isWidescreen (height: number, width: number) : boolean {
		return height * 3 < width * 2;
	}

	/** @ignore */
	private get windowHeight () : number {
		return this.envService.isWeb ? window.innerHeight : 0;
	}

	/** @ignore */
	private get windowWidth () : number {
		return this.envService.isWeb ? window.innerWidth : 0;
	}

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
			this.dimensions.next({
				height: this.windowHeight,
				width: this.windowWidth
			});
		});
	}
}
