#!/usr/bin/env node

import {proto} from '@cyph/sdk';

const {PotassiumData} = proto;

export const webSignAlgorithm = PotassiumData.SignAlgorithms.V2Hardened;
