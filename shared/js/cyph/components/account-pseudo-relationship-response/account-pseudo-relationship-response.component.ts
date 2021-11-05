import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {BehaviorSubject, firstValueFrom} from 'rxjs';
import {map} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {AccountService} from '../../services/account.service';
import {DatabaseService} from '../../services/database.service';
import {StringsService} from '../../services/strings.service';
import {filterUndefinedOperator} from '../../util/filter';

/**
 * Angular component for responding to a pseudo-relationship from a registered
 * user and registering a new pseudo-account if necessary.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-pseudo-relationship-response',
	styleUrls: ['./account-pseudo-relationship-response.component.scss'],
	templateUrl: './account-pseudo-relationship-response.component.html'
})
export class AccountPseudoRelationshipResponseComponent
	extends BaseProvider
	implements OnInit
{
	/** Indicates whether request has been rejected. */
	public readonly rejected = new BehaviorSubject<boolean>(false);

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		const [accept, id] = await Promise.all([
			firstValueFrom(
				this.activatedRoute.data.pipe(
					map((o: {accept?: boolean}) => o.accept),
					filterUndefinedOperator()
				)
			),
			firstValueFrom(
				this.activatedRoute.params.pipe(
					map((o: {id?: string}) => o.id),
					filterUndefinedOperator()
				)
			)
		]);

		if (accept) {
			const username = await this.databaseService.callFunction(
				'acceptPseudoRelationship',
				{id}
			);

			await this.router.navigate(
				typeof username === 'string' && username ?
					['messages', 'user', username] :
					['404']
			);
		}
		else {
			try {
				await this.databaseService.callFunction(
					'rejectPseudoRelationship',
					{id}
				);

				this.rejected.next(true);
				this.accountService.resolveUiReady();
			}
			catch {
				await this.router.navigate(['404']);
			}
		}
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly databaseService: DatabaseService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
