import {Inject, Injectable} from '@angular/core';
import {BehaviorSubject, firstValueFrom} from 'rxjs';
import {map, filter} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {toBehaviorSubject} from '../util/flatten-observable';
import {sleep} from '../util/wait/sleep';

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
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
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
		const newValue = await firstValueFrom(
			this.visibility.pipe(filter(value => value !== initialValue))
		);

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

		let dimensionsEmission = 0;

		window.addEventListener('resize', async () => {
			const n = ++dimensionsEmission;
			const dimensions = {
				height: this.windowHeight,
				width: this.windowWidth
			};

			this.dimensions.next(dimensions);

			for (let i = 0; i < 3; ++i) {
				await sleep((i + 1) * 500);
				if (n !== dimensionsEmission) {
					return;
				}
				this.dimensions.next(dimensions);
			}
		});
	}
}
