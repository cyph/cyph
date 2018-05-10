/**
 * @file Initializes Node polyfills in global scope for browser environments.
 */

import {Buffer} from 'buffer';
import * as process from 'process';


(<any> self).Buffer		= Buffer;
(<any> self).process	= process;
