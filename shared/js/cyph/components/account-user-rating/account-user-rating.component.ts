import {Component, Input} from '@angular/core';
import memoize from 'lodash-es/memoize';
import {reviewMax, User} from '../../account';
import {AccountService} from '../../services/account.service';
import {StringsService} from '../../services/strings.service';
import {trackByIndex} from '../../track-by/track-by-index';
import {numberToString} from '../../util/formatting';


/**
 * Angular component for account user rating UI.
 */
@Component({
	selector: 'cyph-account-user-rating',
	styleUrls: ['./account-user-rating.component.scss'],
	templateUrl: './account-user-rating.component.html'
})
export class AccountUserRatingComponent {
	/** @ignore */
	private readonly uiMaxRating: number	= 5;

	/** Array of star icons based on rating. */
	public readonly getStars	= memoize((rating: number) : [
		('star'|'star_border'|'star_half'),
		('star'|'star_border'|'star_half'),
		('star'|'star_border'|'star_half'),
		('star'|'star_border'|'star_half'),
		('star'|'star_border'|'star_half')
	] => {
		rating *= this.ratingFactor;

		return [
			rating >= 1 ? 'star' : rating >= 0.5 ? 'star_half' : 'star_border',
			rating >= 2 ? 'star' : rating >= 1.5 ? 'star_half' : 'star_border',
			rating >= 3 ? 'star' : rating >= 2.5 ? 'star_half' : 'star_border',
			rating >= 4 ? 'star' : rating >= 3.5 ? 'star_half' : 'star_border',
			rating >= 5 ? 'star' : rating >= 4.5 ? 'star_half' : 'star_border'
		];
	});

	/** @see numberToString */
	public readonly numberToString: typeof numberToString	= numberToString;

	/** Factor to adjust ratings by for display in UI. */
	public readonly ratingFactor: number	= this.uiMaxRating / reviewMax;

	/** @see trackByIndex */
	public readonly trackByIndex: typeof trackByIndex	= trackByIndex;

	/** @see User */
	@Input() public user?: User;

	constructor (
		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
