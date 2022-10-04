#!/usr/bin/env node

import {program} from 'commander';
import {threadPack} from '../../../websign/thread-pack.js';

program.arguments('<rootPath>').action(async rootPath => threadPack(rootPath));

await program.parseAsync();
