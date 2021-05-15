import {
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	OnDestroy,
	OnInit
} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {emailPattern} from '../../email-pattern';
import {ILinkConnectionEmail, LinkConnectionEmail} from '../../proto';
import {EnvService} from '../../services/env.service';
import {LocalStorageService} from '../../services/local-storage.service';
import {StringsService} from '../../services/strings.service';

/**
 * Angular component for link connection email dialog.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-link-connection-email',
	styleUrls: ['./link-connection-email.component.scss'],
	templateUrl: './link-connection-email.component.html'
})
export class LinkConnectionEmailComponent
	extends BaseProvider
	implements OnDestroy, OnInit
{
	/** @see emailPattern */
	public readonly emailPattern = emailPattern;

	/** Cyph link. */
	public link: string = '';

	/** Mailto link. */
	public readonly linkMailto = new BehaviorSubject<SafeUrl | undefined>(
		undefined
	);

	/** Mailto link. */
	public readonly linkTarget: string = this.envService.isMobileOS ?
		'_self' :
		'_blank';

	/** Indicates whether subject and text should be saved to local storage. */
	public saveToLocalStorage: boolean = true;

	/** Email subject. */
	public subject: string = this.envService.isTelehealth ?
		this.stringsService.linkEmailSubjectTelehealth :
		this.stringsService.linkEmailSubject;

	/** Email text. */
	public text: string = this.envService.isTelehealth ?
		this.stringsService.linkEmailTextTelehealth :
		this.stringsService.linkEmailText;

	/** Email recipient. */
	public to: string = '';

	/** @inheritDoc */
	public async ngOnDestroy () : Promise<void> {
		if (this.saveToLocalStorage) {
			await this.localStorageService.setItem<ILinkConnectionEmail>(
				'linkEmail',
				LinkConnectionEmail,
				{
					subject: this.subject,
					text: this.text
				}
			);
		}

		this.linkMailto.next(undefined);

		this.subject = '';
		this.text = '';
		this.to = '';
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		super.ngOnInit();

		this.update();

		try {
			const o = await this.localStorageService.getItem(
				'linkEmail',
				LinkConnectionEmail
			);

			if (o.subject) {
				this.subject = o.subject;
			}

			if (o.text) {
				this.text = o.text;
			}

			this.update();
		}
		catch {}
	}

	/** Updates mailto link. */
	public update () : void {
		this.linkMailto.next(
			this.domSanitizer.bypassSecurityTrustUrl(
				`mailto:${this.to}?subject=${encodeURIComponent(
					this.subject
				)}&body=${encodeURIComponent(
					this.stringsService.setParameters(this.text, {
						link: this.link
					})
				)}`
			)
		);
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @see ChangeDetectorRef */
		public readonly changeDetectorRef: ChangeDetectorRef,

		/** Dialog instance. */
		public readonly matDialogRef: MatDialogRef<LinkConnectionEmailComponent>,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see LocalStorageService */
		public readonly localStorageService: LocalStorageService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
