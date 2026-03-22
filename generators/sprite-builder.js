import { buildCostume } from './costume-builder.js';

const DS_COLORS = {
  dictionary: '#4A90E2',
  hashset: '#7ED321',
  priority_queue: '#F5A623',
  deque: '#9B59B6',
  union_find: '#E74C3C',
  trie: '#1ABC9C',
  segment_tree: '#E67E22',
  lru_cache: '#2ECC71',
  bloom_filter: '#3498DB',
};

const DS_META = {
  dictionary: { name: 'Dictionary', complexity: 'get/set: O(1)' },
  hashset: { name: 'HashSet', complexity: 'contains: O(1)' },
  priority_queue: { name: 'Priority Queue', complexity: 'push/pop-min: O(log n)' },
  deque: { name: 'Deque', complexity: 'push/pop both ends: O(1)' },
  union_find: { name: 'Union-Find', complexity: 'find/union: O(α n)' },
  trie: { name: 'Trie', complexity: 'search: O(m)' },
  segment_tree: { name: 'Segment Tree', complexity: 'query/update: O(log n)' },
  lru_cache: { name: 'LRU Cache', complexity: 'get/put: O(1)' },
  bloom_filter: { name: 'Bloom Filter', complexity: 'contains: O(k)' },
};

export function buildSprite(entry, dsConfig, layerOrder) {
  const { spriteName, dsId } = entry;
  const meta = DS_META[dsId] || { name: dsId, complexity: '' };
  const color = DS_COLORS[dsId] || '#888888';

  const costumeInfo = buildCostume(dsId, meta.name, meta.complexity, color);

  const target = {
    isStage: false,
    name: spriteName,
    variables: dsConfig.variables,
    lists: dsConfig.lists,
    broadcasts: {},
    blocks: dsConfig.blocks,
    comments: {},
    currentCostume: 0,
    costumes: [{
      name: 'costume1',
      dataFormat: 'svg',
      assetId: costumeInfo.assetId,
      md5ext: costumeInfo.md5ext,
      rotationCenterX: 48,
      rotationCenterY: 48,
    }],
    sounds: [],
    volume: 100,
    layerOrder,
    visible: true,
    x: 0,
    y: 0,
    size: 100,
    direction: 90,
    draggable: false,
    rotationStyle: 'all around',
  };

  return {
    target,
    costumes: [{ filename: costumeInfo.md5ext, svgString: costumeInfo.svgString }],
  };
}
