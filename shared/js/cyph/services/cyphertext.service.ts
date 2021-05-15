import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {BaseProvider} from '../base-provider';
import {ChatMessage} from '../chat';
import {potassiumUtil} from '../crypto/potassium/potassium-util';
import {LocalAsyncList} from '../local-async-list';
import {getTimestamp} from '../util/time';
import {AnalyticsService} from './analytics.service';
import {DialogService} from './dialog.service';
import {EnvService} from './env.service';
import {SessionService} from './session.service';
import {StringsService} from './strings.service';

/**
 * Manages cyphertext chat UI.
 */
@Injectable()
export class CyphertextService extends BaseProvider {
	/** Indicates whether cyphertext UI should be enabled. */
	public readonly isEnabled: boolean =
		!this.envService.telehealthTheme.value &&
		(this.envService.debug || this.envService.isHomeSite);

	/** Indicates whether cyphertext should be displayed. */
	public readonly isVisible = new BehaviorSubject<boolean>(false);

	/** Cyphertext message list. */
	public readonly messages: LocalAsyncList<ChatMessage> =
		new LocalAsyncList<ChatMessage>();

	/** Logs new cyphertext message. */
	private async log (
		author: Observable<string>,
		text: string
	) : Promise<void> {
		if (!text || !this.isEnabled) {
			return;
		}

		const timestamp = await getTimestamp();

		await this.messages.updateValue(async messages => [
			.../* Mobile performance optimisation */
			(messages.length > (this.envService.isMobileOS ? 5 : 50) ?
				messages.slice(1) :
				messages),
			new ChatMessage(
				{
					authorID: '',
					authorType: ChatMessage.AuthorTypes.App,
					id: '',
					timestamp,
					value: {text}
				},
				author
			)
		]);
	}

	/** Hides cyphertext UI. */
	public hide () : void {
		if (!this.isVisible.value) {
			return;
		}

		this.isVisible.next(false);

		this.dialogService.toast(this.stringsService.cypherToast3, 1000);
	}

	/** Shows cyphertext UI. */
	public async show () : Promise<void> {
		await this.dialogService.toast(this.stringsService.cypherToast1, 2000);
		await this.dialogService.toast(this.stringsService.cypherToast2, 3000);

		this.isVisible.next(true);

		this.analyticsService.sendEvent('cyphertext', 'show');
	}

	constructor (
		/** @ignore */
		private readonly analyticsService: AnalyticsService,

		/** @ignore */
		private readonly dialogService: DialogService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly sessionService: SessionService,

		/** @ignore */
		private readonly stringsService: StringsService
	) {
		super();

		if (!this.isEnabled) {
			return;
		}

		this.subscriptions.push(
			this.sessionService.cyphertext.subscribe(o => {
				this.log(o.author, potassiumUtil.toBase64(o.cyphertext));
			})
		);
	}
}
