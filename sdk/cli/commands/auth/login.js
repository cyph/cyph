#!/usr/bin/env node

import {program} from 'commander';
import {login} from '../../auth/index.js';

program.name('cyph auth login').action(async () => login());

await program.parseAsync();
