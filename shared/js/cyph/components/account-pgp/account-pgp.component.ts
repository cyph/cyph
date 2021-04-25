import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {SecurityModels} from '../../account';
import {BaseProvider} from '../../base-provider';
import {potassiumUtil} from '../../crypto/potassium/potassium-util';
import {
	emailInput,
	getFormValue,
	input,
	newForm,
	newFormComponent,
	newFormContainer,
	text,
	textarea
} from '../../forms';
import {NewPGPKeyOptions} from '../../pgp';
import {AccountFileRecord, IPGPKey, StringProto} from '../../proto';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountService} from '../../services/account.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {PGPService} from '../../services/crypto/pgp.service';
import {DialogService} from '../../services/dialog.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {copyToClipboard} from '../../util/clipboard';
import {filterUndefined} from '../../util/filter/base';
import {debugLogError} from '../../util/log';

/**
 * Angular component for PGP UI.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-account-pgp',
	styleUrls: ['./account-pgp.component.scss'],
	templateUrl: './account-pgp.component.html'
})
export class AccountPGPComponent extends BaseProvider implements OnInit {
	/** @see copyToClipboard */
	public readonly copyToClipboard = copyToClipboard;

	/** Incoming message. */
	public readonly incomingMessage = {
		cyphertext: new BehaviorSubject<string>(''),
		decrypt: new BehaviorSubject<IPGPKey[]>([]),
		plaintext: new BehaviorSubject<string>(''),
		spinner: new BehaviorSubject<boolean>(false),
		verify: new BehaviorSubject<IPGPKey[]>([])
	};

	/** Indicates whether speed dial is open. */
	public readonly isSpeedDialOpen = new BehaviorSubject<boolean>(false);

	/** @see NewPGPKeyOptions */
	public readonly newPGPKeyOptions = NewPGPKeyOptions;

	/** Outgoing message. */
	public readonly outgoingMessage = {
		cyphertext: new BehaviorSubject<string>(''),
		encrypt: new BehaviorSubject<IPGPKey[]>([]),
		plaintext: new BehaviorSubject<string>(''),
		sign: new BehaviorSubject<IPGPKey[]>([]),
		spinner: new BehaviorSubject<boolean>(false)
	};

	/** All PGP keys. */
	public readonly pgpKeys = this.accountFilesService.filesListFilteredWithData
		.pgpKeys()
		.pipe(
			map(arr =>
				arr.map(({data, record}) => ({
					label: record.name,
					value: data
				}))
			)
		);

	/** Private PGP keys. */
	public readonly pgpPrivateKeys = this.pgpKeys.pipe(
		map(arr => arr.filter(o => o.value.keyPair !== undefined))
	);

	/** @see AccountFileRecord.RecordTypes */
	public readonly recordType = AccountFileRecord.RecordTypes.PGPKey;

	/** @see trackBySelf */
	public readonly trackBySelf = trackBySelf;

	/** Generates and uploads a new PGP key. */
	/* eslint-disable-next-line complexity */
	public async generate (
		newPGPKeyOptions: NewPGPKeyOptions = NewPGPKeyOptions.generate
	) : Promise<void> {
		const subtitle =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				this.stringsService.newPGPKeyGenerateText :
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				this.stringsService.newPGPKeyImportPublicKeyText :
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				this.stringsService.newPGPKeyImportPrivateKeyText :
				undefined;

		const title =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				this.stringsService.newPGPKeyGenerate :
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				this.stringsService.newPGPKeyImportPublicKey :
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				this.stringsService.newPGPKeyImportPrivateKey :
				undefined;

		if (!subtitle || !title) {
			return;
		}

		const generateForm = await this.dialogService.prompt({
			content: '',
			form: newForm([
				newFormComponent([
					newFormContainer([
						text({
							label: subtitle
						})
					])
				]),
				newFormComponent([
					...(newPGPKeyOptions === NewPGPKeyOptions.generate ?
						await Promise.all([
							this.accountDatabaseService
								.getItem(
									'email',
									StringProto,
									SecurityModels.unprotected
								)
								.catch(() => undefined),
							this.accountDatabaseService.currentUser.value?.user.accountUserProfile
								.getValue()
								.catch(() => undefined)
						]).then(async ([userEmail, profile]) => [
							newFormContainer([input({
									label: this.stringsService
										.newPGPKeyNameInput,
									required: false,
									value: profile?.name
								})]),
							newFormContainer([emailInput({
									label: this.stringsService
										.newPGPKeyEmailInput,
									required: false,
									value: userEmail
								})]),
							newFormContainer([input({
									label: this.stringsService
										.newPGPKeyCommentInput,
									required: false
								})])
						]) :
					newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
						[
							newFormContainer([textarea({
									label: this.stringsService
										.newPGPKeyImportPublicKeyInput,
									required: true
								})])
						] :
					newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
						[
							newFormContainer([textarea({
									label: this.stringsService
										.newPGPKeyImportPrivateKeyInput,
									required: true
								})])
						] :
						[])
				])
			]),
			title
		});

		if (generateForm === undefined) {
			return;
		}

		const name =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				getFormValue(generateForm, 'string', 1, 0, 0) :
				undefined;

		const email =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				getFormValue(generateForm, 'string', 1, 1, 0) :
				undefined;

		const comment =
			newPGPKeyOptions === NewPGPKeyOptions.generate ?
				getFormValue(generateForm, 'string', 1, 2, 0) :
				undefined;

		const publicKey =
			newPGPKeyOptions === NewPGPKeyOptions.importPublicKey ?
				getFormValue(generateForm, 'string', 1, 0, 0) :
				undefined;

		const privateKey =
			newPGPKeyOptions === NewPGPKeyOptions.importPrivateKey ?
				getFormValue(generateForm, 'string', 1, 0, 0) :
				undefined;

		switch (newPGPKeyOptions) {
			case NewPGPKeyOptions.importPublicKey:
				if (!(typeof publicKey === 'string' && publicKey.length > 0)) {
					return;
				}
				break;

			case NewPGPKeyOptions.importPrivateKey:
				if (
					!(typeof privateKey === 'string' && privateKey.length > 0)
				) {
					return;
				}
		}

		const keyPair =
			publicKey !== undefined ?
				undefined :
				await this.pgpService.keyPair(
					privateKey !== undefined ?
						{privateKey} :
						{comment, email, name},
					true
				);

		const {
			pgpMetadata,
			publicKeyBytes
		} = await this.pgpService.getPublicKeyMetadata(
			publicKey !== undefined ? publicKey : keyPair?.publicKey
		);

		const pgpKey: IPGPKey | undefined =
			keyPair !== undefined ?
				{
					keyPair,
					pgpMetadata
				} :
			publicKeyBytes !== undefined ?
				{
					pgpMetadata,
					publicKey: publicKeyBytes
				} :
				undefined;

		if (
			pgpKey === undefined ||
			!pgpMetadata.fingerprint ||
			!pgpMetadata.keyID
		) {
			return;
		}

		try {
			await this.accountFilesService.uploadPGPKey(pgpKey);
		}
		catch (err) {
			debugLogError(() => ({pgpKeyUploadFailure: {err}}));

			await this.dialogService.alert({
				content: this.stringsService.newPGPKeyErrorText,
				title: this.stringsService.newPGPKeyErrorTitle
			});
		}
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		super.ngOnInit();

		this.accountService.transitionEnd();
	}

	/** Processes incoming message. */
	public async processIncomingMessage () : Promise<void> {
		this.incomingMessage.plaintext.next('');
		this.incomingMessage.spinner.next(true);

		try {
			const verificationPublicKeys = filterUndefined(
				this.incomingMessage.verify.value.map(o =>
					!potassiumUtil.isEmpty(o.publicKey) ?
						o.publicKey :
						o.keyPair?.publicKey
				)
			);

			const decryptionKeyPairs = filterUndefined(
				this.incomingMessage.decrypt.value.map(o =>
					!potassiumUtil.isEmpty(o.keyPair?.privateKey) ?
						o.keyPair :
						undefined
				)
			);

			if (
				verificationPublicKeys.length < 1 &&
				decryptionKeyPairs.length < 1
			) {
				return;
			}

			this.incomingMessage.plaintext.next(
				await (decryptionKeyPairs.length > 0 ?
					this.pgpService.box.open(
						this.incomingMessage.cyphertext.value,
						decryptionKeyPairs,
						verificationPublicKeys
					) :
				verificationPublicKeys.length > 0 ?
					this.pgpService.sign.open(
						this.incomingMessage.cyphertext.value,
						verificationPublicKeys
					) :
					'')
			);
		}
		catch (err) {
			this.dialogService
				.toast(
					this.stringsService.setParameters(
						this.stringsService.errorMessage,
						{
							error: (err.message || err.toString()).replace(
								/\.$/g,
								''
							)
						}
					),
					0,
					this.stringsService.ok
				)
				.catch(() => {});
		}
		finally {
			this.incomingMessage.spinner.next(false);
		}
	}

	/** Processes outgoing message. */
	public async processOutgoingMessage () : Promise<void> {
		this.outgoingMessage.cyphertext.next('');
		this.outgoingMessage.spinner.next(true);

		try {
			const encryptionPublicKeys = filterUndefined(
				this.outgoingMessage.encrypt.value.map(o =>
					!potassiumUtil.isEmpty(o.publicKey) ?
						o.publicKey :
						o.keyPair?.publicKey
				)
			);

			const signingPrivateKeys = filterUndefined(
				this.outgoingMessage.sign.value.map(o =>
					!potassiumUtil.isEmpty(o.keyPair?.privateKey) ?
						o.keyPair?.privateKey :
						undefined
				)
			);

			if (
				encryptionPublicKeys.length < 1 &&
				signingPrivateKeys.length < 1
			) {
				return;
			}

			this.outgoingMessage.cyphertext.next(
				await (encryptionPublicKeys.length > 0 ?
					this.pgpService.box.seal(
						this.outgoingMessage.plaintext.value,
						encryptionPublicKeys,
						signingPrivateKeys
					) :
				signingPrivateKeys.length > 0 ?
					this.pgpService.sign.sign(
						this.outgoingMessage.plaintext.value,
						signingPrivateKeys
					) :
					'')
			);
		}
		catch (err) {
			this.dialogService
				.toast(
					this.stringsService.setParameters(
						this.stringsService.errorMessage,
						{
							error: (err.message || err.toString()).replace(
								/\.$/g,
								''
							)
						}
					),
					0,
					this.stringsService.ok
				)
				.catch(() => {});
		}
		finally {
			this.outgoingMessage.spinner.next(false);
		}
	}

	constructor (
		/** @ignore */
		private readonly dialogService: DialogService,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see PGPService */
		public readonly pgpService: PGPService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
