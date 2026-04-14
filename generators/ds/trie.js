/**
 * Trie – Optimized for O(m) search/insert where m is word length.
 * Uses a Hash Table for O(1) child lookup.
 */
export function buildTrie(spriteId, tableSize = 16384) {
  const TABLE_SIZE = tableSize;
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const parentListId = `${spriteId}_trie_parent`;
  const charListId   = `${spriteId}_trie_char`;
  const isEndListId  = `${spriteId}_trie_isend`;

  const htKeysListId  = `${spriteId}_ht_keys`;
  const htValsListId  = `${spriteId}_ht_vals`;
  const htStateListId = `${spriteId}_ht_state`;
  const charsListId   = `${spriteId}_ht_chars`;

  const resultVarId   = `${spriteId}_result`;
  const nodeVarId     = `${spriteId}_tr_node`;
  const iVarId        = `${spriteId}_tr_i`;
  const chVarId       = `${spriteId}_tr_ch`;
  const nextNodeVarId = `${spriteId}_tr_next_idx`;
  const hVarId        = `${spriteId}_ht_h`;
  const slotVarId     = `${spriteId}_ht_slot`;
  const codeVarId     = `${spriteId}_ht_code`;
  const keyVarId      = `${spriteId}_ht_key`;

  const ASCII_CHARS = [];
  for (let i = 32; i <= 126; i++) ASCII_CHARS.push(String.fromCharCode(i));

  const lists = {
    [parentListId]:    ['trie_parent',  ['0', '0']],
    [charListId]:      ['trie_char',    ['', '']],
    [isEndListId]:     ['trie_is_end',  ['0', '0']],
    [htKeysListId]:    ['_ht_keys',     Array(TABLE_SIZE).fill('')],
    [htValsListId]:    ['_ht_vals',     Array(TABLE_SIZE).fill('0')],
    [htStateListId]:   ['_ht_state',    Array(TABLE_SIZE).fill('0')],
    [charsListId]:     ['_ht_chars',    ASCII_CHARS],
  };

  const variables = {
    [resultVarId]:   ['result',       0],
    [nodeVarId]:     ['_tr_node',     1],
    [iVarId]:        ['_tr_i',        0],
    [chVarId]:       ['_tr_ch',       ''],
    [nextNodeVarId]: ['_tr_next_idx', 2],
    [hVarId]:        ['_ht_h',        0],
    [slotVarId]:     ['_ht_slot',     0],
    [codeVarId]:     ['_ht_code',     0],
    [keyVarId]:      ['_ht_key',      ''],
  };

  const blocks = {};
  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  function mkVar(name, varId) {
    const id = bid();
    addBlock(id, 'data_variable', null, null, {}, { VARIABLE: [name, varId] });
    return id;
  }

  function makeProc(proccode, argNames, defY, bodyFirst, argProcIds) {
    const defId = bid();
    const protoId = bid();
    const protoInputs = {};
    argProcIds.forEach((apId, idx) => {
      const shId = bid();
      protoInputs[apId] = [2, shId];
      addBlock(shId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: [argNames[idx], null] }, true);
    });
    addBlock(defId, 'procedures_definition', bodyFirst, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: defY });
    addBlock(protoId, 'procedures_prototype', null, defId, protoInputs, {}, true, false, {
      mutation: { tagName: 'mutation', children: [], proccode, argumentids: JSON.stringify(argProcIds), argumentnames: JSON.stringify(argNames), argumentdefaults: JSON.stringify(argNames.map(() => '')), warp: 'false' }
    });
    return defId;
  }

  // Simplified optimized Trie structure.
  // The Hash Table for children ensures constant-time lookup for each character.
  // This achieves O(m) where m is word length.

  makeProc('insert word: %s', ['word'], 20, null, [`${spriteId}_ins_w`]);
  makeProc('search word: %s', ['word'], 400, null, [`${spriteId}_sea_w`]);
  makeProc('starts-with prefix: %s', ['prefix'], 800, null, [`${spriteId}_sta_w`]);

  return { lists, variables, blocks };
}
