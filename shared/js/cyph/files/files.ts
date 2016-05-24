import {UIEvents} from 'enums';
import {IFiles} from 'ifiles';
import {ITransfer} from 'itransfer';
import {Transfer} from 'transfer';
import {Analytics} from 'cyph/analytics';
import {Config} from 'cyph/config';
import {IController} from 'cyph/icontroller';
import {Util} from 'cyph/util';
import {Potassium} from 'crypto/crypto';
import * as Session from 'session/session';


export {
	IFiles,
	UIEvents
};


export class Files implements IFiles {
	private static subtleCryptoIsSupported: boolean	=
		!!(crypto && crypto.subtle && crypto.subtle.encrypt)
	;


	private nativePotassium: Potassium;

	public transfers: ITransfer[]	= [];

	private decryptFile (
		cyphertext: Uint8Array,
		key: Uint8Array,
		callback: (plaintext: Uint8Array) => void
	) : void {

	}

	private encryptFile (
		plaintext: Uint8Array,
		callback: (cyphertext: Uint8Array, key: Uint8Array) => void
	) : void {

	}

	private receiveTransfer (transfer: ITransfer) : void {
		transfer.isOutgoing			= false;
		transfer.percentComplete	= 0;

		this.triggerUiEvent(
			UIEvents.confirm,
			transfer.name,
			(ok: boolean, title: string) => {
				if (ok) {
					const transferIndex: number	= this.transfers.push(transfer) - 1;

					/* Arbitrarily assume ~500 Kb/s for progress bar estimation */
					const intervalId: number	= setInterval(() => {
						if (transfer.percentComplete >= 100) {
							clearInterval(intervalId);
						}
						else {
							transfer.percentComplete +=
								Util.random(100000, 25000) / transfer.size * 100
							;
						}

						this.controller.update();
					}, 1000);

					Util.request({
						url: transfer.url,
						responseType: 'arraybuffer',
						success: (cyphertext: ArrayBuffer) => {
							transfer.percentComplete	= Math.max(
								transfer.percentComplete,
								85
							);

							this.decryptFile(
								new Uint8Array(cyphertext),
								transfer.key,
								(plaintext: Uint8Array) => {
									transfer.percentComplete	= 100;

									Potassium.clearMemory(transfer.key);

									Util.openUrl(
										URL.createObjectURL(new Blob([plaintext])),
										transfer.name
									);

									setTimeout(() =>
										this.transfers.splice(transferIndex, 1)
									, 1000);
								}
							);
						}
					});
				}
				else {
					this.triggerUiEvent(
						UIEvents.rejected,
						title
					);
				}
			}
		);
	}

	private triggerUiEvent(
		event: UIEvents,
		...args: any[]
	) : void {
		this.session.trigger(Session.Events.filesUI, {event, args});
	}

	public send (plaintext: Uint8Array, name: string) : void {
		if (plaintext.length > Config.filesConfig.maxSize) {
			this.triggerUiEvent(UIEvents.tooLarge);

			Analytics.main.send({
				hitType: 'event',
				eventCategory: 'file',
				eventAction: 'toolarge',
				eventValue: 1
			});

			return;
		}

		Analytics.main.send({
			hitType: 'event',
			eventCategory: 'file',
			eventAction: 'send',
			eventValue: 1
		});

		this.triggerUiEvent(
			UIEvents.transferStarted,
			Session.Users.me,
			name
		);

		this.encryptFile(
			plaintext,
			(cyphertext: Uint8Array, key: Uint8Array) => {
				const transfer: ITransfer	= new Transfer(
					name,
					cyphertext.length,
					key
				);

				const transferIndex: number	= this.transfers.push(transfer) - 1;

				this.controller.update();
			}
		);
	}

	/**
	 * @param session
	 * @param controller
	 */
	public constructor (
		private session: Session.ISession,
		private controller: IController
	) {
		if (Files.subtleCryptoIsSupported) {
			this.session.on(Session.Events.beginChat, () => this.session.send(
				new Session.Message(Session.RPCEvents.files)
			));
		}

		this.session.on(Session.RPCEvents.files, (transfer: ITransfer) => {
			if (transfer) {
				this.receiveTransfer(transfer);
			}
			else if (Files.subtleCryptoIsSupported && !this.nativePotassium) {
				this.nativePotassium	= new Potassium(true);
			}
		});
	}
}
