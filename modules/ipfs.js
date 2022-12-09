#!/usr/bin/env node

import {MemoryDatastore} from 'interface-datastore';
import * as IPFS from 'ipfs-core';
import ipfsRepo from 'ipfs-repo';
import * as rawCodec from 'multiformats/codecs/raw';

const {
	createRepo,
	locks: {memory: memoryLock}
} = ipfsRepo;

export const ipfs = IPFS.create({
	repo: createRepo(
		'/dev/null',
		() => rawCodec,
		{
			blocks: new MemoryDatastore(),
			datastore: new MemoryDatastore(),
			keys: new MemoryDatastore(),
			pins: new MemoryDatastore(),
			root: new MemoryDatastore()
		},
		{autoMigrate: false, repoLock: memoryLock, repoOwner: true}
	)
});
