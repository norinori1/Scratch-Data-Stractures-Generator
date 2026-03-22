import { buildSprite } from './sprite-builder.js';
import { buildDictionary } from './ds/dictionary.js';
import { buildHashset } from './ds/hashset.js';
import { buildPriorityQueue } from './ds/priority-queue.js';
import { buildDeque } from './ds/deque.js';
import { buildUnionFind } from './ds/union-find.js';
import { buildTrie } from './ds/trie.js';
import { buildSegmentTree } from './ds/segment-tree.js';
import { buildLruCache } from './ds/lru-cache.js';
import { buildBloomFilter } from './ds/bloom-filter.js';

const DS_BUILDERS = {
  dictionary: buildDictionary,
  hashset: buildHashset,
  priority_queue: buildPriorityQueue,
  deque: buildDeque,
  union_find: buildUnionFind,
  trie: buildTrie,
  segment_tree: buildSegmentTree,
  lru_cache: buildLruCache,
  bloom_filter: buildBloomFilter,
};

const stage = {
  isStage: true,
  name: 'Stage',
  variables: {},
  lists: {},
  broadcasts: {},
  blocks: {},
  comments: {},
  currentCostume: 0,
  costumes: [{
    name: 'backdrop1',
    dataFormat: 'svg',
    assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
    rotationCenterX: 240,
    rotationCenterY: 180,
  }],
  sounds: [],
  volume: 100,
  layerOrder: 0,
  tempo: 60,
  videoTransparency: 50,
  videoState: 'on',
  textToSpeechLanguage: null,
};

export function buildProject(entries) {
  const targets = [stage];
  const allCostumes = [];

  entries.forEach((entry, index) => {
    const { dsId, spriteName } = entry;
    const spriteId = `${dsId}_${index}`;
    const builder = DS_BUILDERS[dsId];
    if (!builder) return;

    const dsConfig = builder(spriteId);
    const { target, costumes } = buildSprite(entry, dsConfig, index + 1);
    targets.push(target);
    allCostumes.push(...costumes);
  });

  const projectJson = {
    targets,
    monitors: [],
    extensions: [],
    meta: {
      semver: '3.0.0',
      vm: '0.2.0',
      agent: 'ScratchDSGenerator/1.0',
    },
  };

  return { projectJson, costumes: allCostumes };
}
