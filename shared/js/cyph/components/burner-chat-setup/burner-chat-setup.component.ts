import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Output
} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {SessionInitService} from '../../services/session-init.service';
import {StringsService} from '../../services/strings.service';
import {trackByIndex} from '../../track-by/track-by-index';

/**
 * Angular component for burner chat setup UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-burner-chat-setup',
	styleUrls: ['./burner-chat-setup.component.scss'],
	templateUrl: './burner-chat-setup.component.html'
})
export class BurnerChatSetupComponent extends BaseProvider {
	/** @see SessionInitService.ephemeralGroupMemberNames */
	public readonly groupMemberNames = new BehaviorSubject<string[]>([]);

	/** Emits when setup is complete. */
	@Output() public readonly setupComplete = new EventEmitter<void>();

	/** UI state. */
	public readonly state = new BehaviorSubject<number>(0);

	/** UI states. */
	public readonly states = {
		complete: 2,
		initial: 0,
		selectingGroupMembers: 1
	};

	/** @see trackByIndex */
	public readonly trackByIndex = trackByIndex;

	/** Adds a value to the group. */
	public addToGroup (value: string) : void {
		this.groupMemberNames.next(this.groupMemberNames.value.concat(value));
	}

	/** Removes a value from the group. */
	public removeFromGroup (value: string) : void {
		const i = this.groupMemberNames.value.indexOf(value);

		if (i < 0) {
			return;
		}

		this.groupMemberNames.next(
			this.groupMemberNames.value
				.slice(0, i)
				.concat(this.groupMemberNames.value.slice(i + 1))
		);
	}

	/** Sets group member names (if applicable) and completes setup. */
	public setGroupMemberNames (useGroup: boolean = true) : void {
		this.sessionInitService.ephemeralGroupMemberNames.resolve(
			useGroup ? this.groupMemberNames.value : []
		);

		this.state.next(this.states.complete);
		this.setupComplete.emit();
	}

	constructor (
		/** @see SessionInitService */
		public readonly sessionInitService: SessionInitService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
