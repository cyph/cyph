import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IThread} from '../ithread';
import {MaybePromise} from '../maybe-promise-type';
import {Thread} from '../thread';
import {request} from '../util/request';
import {uuid} from '../util/uuid';
import {resolvable, waitForValue} from '../util/wait';
import {EnvService} from './env.service';

/**
 * Angular service for managing Workers.
 */
@Injectable()
export class WorkerService extends BaseProvider {
	/** @ignore */
	private readonly serviceWorkerResolvers: Map<
		string,
		{
			reject: (err: any) => void;
			resolve: (o: any) => void;
		}
	> = new Map();

	/** @see ServiceWorker */
	public readonly serviceWorker: Promise<ServiceWorker>;

	/** @see ServiceWorkerRegistration */
	public readonly serviceWorkerRegistration: Promise<
		ServiceWorkerRegistration
	> = (async () =>
		navigator.serviceWorker.register(
			this.envService.webSignPaths.serviceWorker
		))();

	/** @see Thread */
	public async createThread<T> (
		f: () => void,
		locals: MaybePromise<any> = {}
	) : Promise<IThread<T>> {
		if (locals instanceof Promise) {
			locals = await locals;
		}

		return new Thread<T>(f, locals);
	}

	/** Runs a function in the context of the ServiceWorker. */
	public async registerServiceWorkerFunction<I, O> (
		name: string,
		input: MaybePromise<I>,
		f: (input: I, ...localVars: any[]) => MaybePromise<O>
	) : Promise<O> {
		const serviceWorker = await this.serviceWorker;
		const id = uuid();
		const output = resolvable<O>();
		let scriptText = `importedFunction = ${f.toString()};`;

		/* Workaround for local environments not having WebSign packing */
		if (this.envService.isLocalEnv) {
			/* Temporarily casting until TypeScript adds matchAll definition */
			/* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */
			for (const [toReplace, url] of <[string, string][]> (
				Array.from(
					(<any> scriptText).matchAll(
						/importScripts\(\s*["'](.*?)["']\s*\)/g
					)
				)
			)) {
				scriptText = scriptText.replace(
					toReplace,
					`\n\n${await request({url})}\n\n`
				);
			}
		}

		this.serviceWorkerResolvers.set(id, output);

		serviceWorker.postMessage({
			cyphFunction: true,
			id,
			input: await input,
			name,
			scriptText
		});

		return output;
	}

	/** Removes a previously set ServiceWorker function. */
	public async unregisterServiceWorkerFunction (
		name: string
	) : Promise<void> {
		const serviceWorker = await this.serviceWorker;

		serviceWorker.postMessage({
			cyphFunction: true,
			name,
			unregister: true
		});
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		super();

		this.serviceWorker = this.serviceWorkerRegistration.then(async () => {
			navigator.serviceWorker.addEventListener('message', (e: any) => {
				if (!e.data || typeof e.data.id !== 'string') {
					return;
				}

				const output = this.serviceWorkerResolvers.get(e.data.id);
				if (!output) {
					return;
				}

				if (e.data.rejection) {
					output.reject(e.data.err);
				}
				else {
					output.resolve(e.data.output);
				}
			});

			return waitForValue(
				() => navigator.serviceWorker.controller || undefined
			);
		});

		this.serviceWorker.catch(() => {});
	}
}
