import {UIEvents} from 'enums';
import {IFiles} from 'ifiles';
import {ITransfer} from 'itransfer';
import {Transfer} from 'transfer';
import {Analytics} from 'cyph/analytics';
import {Config} from 'cyph/config';
import {Firebase} from 'cyph/firebase';
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
		!!(crypto && crypto.subtle && crypto.subtle.encrypt) &&
		locationData.protocol === 'https:'
	;


	private nativePotassium: Potassium;

	public transfers: ITransfer[]	= [];

	private decryptFile (
		cyphertext: Uint8Array,
		key: Uint8Array,
		callback: (plaintext: Uint8Array) => void
	) : void {
		if (this.nativePotassium) {
			this.nativePotassium.SecretBox.open(
				cyphertext,
				key,
				(plaintext: Uint8Array, err: any) => {
					callback(err ?
						Potassium.fromString('File decryption failed.') :
						plaintext
					);
				}
			);
		}
		else {
			throw new Error('Not implemented.');
		}
	}

	private encryptFile (
		plaintext: Uint8Array,
		callback: (cyphertext: Uint8Array, key: Uint8Array) => void
	) : void {
		if (this.nativePotassium) {
			const key: Uint8Array	= Potassium.randomBytes(
				this.nativePotassium.SecretBox.keyBytes
			);

			this.nativePotassium.SecretBox.seal(
				plaintext,
				key,
				(cyphertext: Uint8Array, err: any) => {
					callback(
						err ?
							new Uint8Array(0) :
							cyphertext
						,
						key
					);
				}
			);
		}
		else {
			throw new Error('Not implemented.');
		}
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

							Firebase.call({ storage: {
								refFromURL: { args: [transfer.url],
								delete: {}}
							}});

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

									setTimeout(() => {
										this.transfers.splice(transferIndex, 1);
										this.controller.update();
									}, 1000);
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

			Analytics.send({
				hitType: 'event',
				eventCategory: 'file',
				eventAction: 'toolarge',
				eventValue: 1
			});

			return;
		}

		Analytics.send({
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

		this.session.send(new Session.Message(
			Session.RPCEvents.files,
			name
		));

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

				Util.retryUntilComplete(retry => {
					const path: string	= 'ephemeral/' +  Util.generateGuid();

					Firebase.call({ storage: {
						ref: { args: [path],
						put: { args: [new Blob([cyphertext])],
						on: { args: [
							'state_changed',
							snapshot => {
								transfer.percentComplete	=
									snapshot.bytesTransferred /
									snapshot.totalBytes *
									100
								;

								this.controller.update();
							},
							err => retry(),
							() => {
								Firebase.call({ storage: {
									ref: { args: [path],
									getDownloadURL: {
										then: { args: [(url: string) => {
											transfer.url	= url;
											this.session.send(new Session.Message(
												Session.RPCEvents.files,
												transfer
											));

											this.transfers.splice(transferIndex, 1);
											this.controller.update();
										}]}
									}}
								}});
							}
						]}}}
					}});
				});
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

		this.session.on(Session.RPCEvents.files, (data?: string|ITransfer) => {
			if (typeof data === 'string') {
				this.triggerUiEvent(
					UIEvents.transferStarted,
					Session.Users.friend,
					data
				);
			}
			else if (data) {
				this.receiveTransfer(data);
			}
			else if (Files.subtleCryptoIsSupported && !this.nativePotassium) {
				this.nativePotassium	= new Potassium(true);
			}
		});
	}
}
