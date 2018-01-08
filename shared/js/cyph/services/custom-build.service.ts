import {Injectable} from '@angular/core';
import {SafeUrl} from '@angular/platform-browser';
import {DataURIProto} from '../proto';
import {deserialize} from '../util/serialization';


/**
 * Angular service for custom build data.
 */
@Injectable()
export class CustomBuildService {
	/** @see customBuildAudioImage */
	public readonly audioImage?: Promise<SafeUrl>		= customBuildAudioImage ?
		deserialize(DataURIProto, customBuildAudioImage) :
		undefined
	;

	/** @see customBuildErrorImage */
	public readonly errorImage?: Promise<SafeUrl>		= customBuildErrorImage ?
		deserialize(DataURIProto, customBuildErrorImage) :
		undefined
	;

	/** @see customBuildFavicon */
	public readonly favicon?: Promise<SafeUrl>			= customBuildFavicon ?
		deserialize(DataURIProto, customBuildFavicon) :
		undefined
	;

	/** @see customBuildLogoHorizontal */
	public readonly logoHorizontal?: Promise<SafeUrl>	= customBuildLogoHorizontal ?
		deserialize(DataURIProto, customBuildLogoHorizontal) :
		undefined
	;

	/** @see customBuildLogoVertical */
	public readonly logoVertical?: Promise<SafeUrl>		= customBuildLogoVertical ?
		deserialize(DataURIProto, customBuildLogoVertical) :
		undefined
	;

	constructor () {}
}
