import {Injectable} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {BaseProvider} from '../base-provider';
import {IChatMessage, ISessionMessageList} from '../proto/types';
import {lockFunction} from '../util/lock';
import {EnvService} from './env.service';
import {WorkerService} from './worker.service';

/**
 * Angular service for wrapping a protobuf thread.
 */
@Injectable()
export class ProtoThreadService extends BaseProvider {
	/** Proxy for generated protobuf code inside a worker. */
	private readonly protoInternal = memoize((_I: number) => {
		const protoPromise = this.workerService
			.createThread<any>(
				/* eslint-disable-next-line prefer-arrow/prefer-arrow-functions */
				function () : void {
					importScripts('/assets/js/proto/worker.js');

					(<any> self).Comlink.expose(
						{
							callProto: (
								key: string,
								method: string,
								arg?: any
							) : any => {
								const protoClass = (<any> self).$root
									.protoMappings[key];

								if (method === 'create') {
									return protoClass.toObject(
										{},
										{defaults: true}
									);
								}

								let o = protoClass[method](arg);

								if (
									method === 'encode' &&
									!(o instanceof Uint8Array)
								) {
									o = o.finish();
								}

								return o;
							}
						},
						self
					);
				}
			)
			.then(async thread => thread.api);

		const lock = lockFunction();

		return async (f: (proto: any) => Promise<any>) =>
			lock(async () => f(await protoPromise));
	});

	/** @ignore */
	private roundRobinIndex: number = 0;

	/** @ignore */
	private readonly roundRobinMax: number = Math.max(
		Math.floor(this.envService.hardwareConcurrency / 2),
		1
	);

	/** Proto thread pool (round robin load balanced for now). */
	private async getProto (f: (proto: any) => Promise<any>) : Promise<any> {
		this.roundRobinIndex =
			this.roundRobinIndex >= this.roundRobinMax ?
				0 :
				this.roundRobinIndex + 1;

		return this.protoInternal(this.roundRobinIndex)(f);
	}

	/** Preprocess classes that implement IProto<T> but cannot be directly cloned. */
	private handleSpecialCases (key: string, method: string, arg?: any) : any {
		if (method === 'decode' || typeof arg !== 'object' || !arg) {
			return arg;
		}

		switch (key) {
			case 'ChatMessage': {
				const o: IChatMessage = arg;

				return <IChatMessage> {
					authorID: o.authorID,
					authorType: o.authorType,
					hash: o.hash,
					id: o.id,
					key: o.key,
					predecessors: o.predecessors,
					selfDestructTimeout: o.selfDestructTimeout,
					sessionSubID: o.sessionSubID,
					timestamp: o.timestamp,
					value: o.value
				};
			}

			case 'SessionMessageList': {
				const o: ISessionMessageList = arg;

				return <ISessionMessageList> {
					messages: o.messages?.map(message => ({
						data: {
							authorID: message.data.authorID,
							bytes: message.data.bytes,
							chatState: message.data.chatState,
							command: message.data.command,
							id: message.data.id,
							sessionSubID: message.data.sessionSubID,
							text: message.data.text,
							textConfirmation: message.data.textConfirmation,
							timestamp: message.data.timestamp
						},
						event: message.event
					}))
				};
			}

			default: {
				return arg;
			}
		}
	}

	/** Calls proto thread. */
	public async callProto (
		key: string,
		method: string,
		arg?: any
	) : Promise<any> {
		arg = this.handleSpecialCases(key, method, arg);
		return this.getProto(async o => o.callProto(key, method, arg));
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();
	}
}
