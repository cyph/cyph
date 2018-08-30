import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {MatDialogRef} from '@angular/material/dialog';
import {BehaviorSubject} from 'rxjs';
import {BaseProvider} from '../../base-provider';
import {emailPattern} from '../../email-pattern';
import {EnvService} from '../../services/env.service';
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
export class LinkConnectionEmailComponent extends BaseProvider implements OnDestroy, OnInit {
	/** @see emailPattern */
	public readonly emailPattern		= emailPattern;

	/** Cyph link. */
	public link: string					= '';

	/** Mailto link. */
	public readonly linkMailto			= new BehaviorSubject<SafeUrl|undefined>(undefined);

	/** Mailto link. */
	public readonly linkTarget: string	= this.envService.isMobileOS ? '_self' : '_blank';

	/** Email subject. */
	public subject: string				= this.stringsService.linkConnectionEmailSubject;

	/** Email text. */
	public text: string					= this.stringsService.linkConnectionEmailText;

	/** Email recipient. */
	public to: string					= '';

	/** @inheritDoc */
	public ngOnDestroy () : void {
		this.linkMailto.next(undefined);

		this.subject	= '';
		this.text		= '';
		this.to			= '';
	}

	/** @inheritDoc */
	public ngOnInit () : void {
		this.update();
	}

	/** Updates mailto link. */
	public update () : void {
		this.linkMailto.next(this.domSanitizer.bypassSecurityTrustUrl(
			`mailto:${this.to}?subject=${
				encodeURIComponent(this.subject)
			}&body=${
				encodeURIComponent(this.text.replace(/\${LINK}/g, this.link))
			}`
		));
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** Dialog instance. */
		public readonly matDialogRef: MatDialogRef<LinkConnectionEmailComponent>,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
