import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {filter} from 'rxjs/operators';
import {BaseProvider} from '../base-provider';
import {prettyPrint, stringify} from '../util/serialization';
import {uuid} from '../util/uuid';
import {sleep} from '../util/wait';
import {AccountFilesService} from './account-files.service';
import {AccountService} from './account.service';
import {PotassiumService} from './crypto/potassium.service';
import {EnvService} from './env.service';

/** Used for testing and debugging. */
@Injectable()
export class AccountDebugService extends BaseProvider {
	/** Shares debug logs with @cyph. */
	public async shareLogsWithCyph (
		targetUser: string = 'cyph'
	) : Promise<void> {
		await firstValueFrom(
			this.accountService.interstitial.pipe(filter(b => !b))
		);

		this.accountService.interstitial.next(true);

		await Promise.all([
			this.accountFilesService.upload(
				`${uuid()}.log`,
				{
					data: this.potassiumService.fromString(
						[
							(await this.envService.packageName) + '\n---',
							...(<Record<string, any>[]> (<any> self).logs).map(
								o =>
									`${o.timestamp}${
										o.error ? ' (error)' : ''
									}: ${
										o.argsCopy !== undefined ?
											prettyPrint(o.argsCopy) :
											stringify({
												keys: Object.keys(o.args)
											})
									}`
							)
						].join('\n\n\n\n') + '\n'
					),
					mediaType: 'text/plain',
					name: ''
				},
				targetUser
			).result,
			sleep(1000)
		]);

		this.accountService.interstitial.next(false);
	}

	constructor (
		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly accountFilesService: AccountFilesService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) {
		super();
	}
}
