export function buildLruCache(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const keysListId = `${spriteId}_lru_keys`;
  const valsListId = `${spriteId}_lru_vals`;
  const orderListId = `${spriteId}_lru_order`;
  const resultVarId = `${spriteId}_result`;
  const capVarId = `${spriteId}_lru_cap`;
  const idxVarId = `${spriteId}_lru_idx`;

  const lists = {
    [keysListId]: ['lru_keys', []],
    [valsListId]: ['lru_vals', []],
    [orderListId]: ['lru_order', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
    [capVarId]: ['_lru_cap', 0],
    [idxVarId]: ['_lru_idx', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // ── Procedure 1: set-capacity cap: %s ────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_setcap`;

    const argR = bid();
    const setCapId = bid();
    const delKeysId = bid();
    const delValsId = bid();
    const delOrdId = bid();

    addBlock(defId, 'procedures_definition', setCapId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'set-capacity cap: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['cap']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['cap', null] }, true, false);

    addBlock(argR, 'argument_reporter_string_number', null, setCapId, {}, { VALUE: ['cap', null] }, false, false);
    addBlock(setCapId, 'data_setvariableto', delKeysId, defId,
      { VALUE: [3, argR, [10, '']] }, { VARIABLE: ['_lru_cap', capVarId] }, false, false);
    addBlock(delKeysId, 'data_deletealloflist', delValsId, setCapId, {}, { LIST: ['lru_keys', keysListId] }, false, false);
    addBlock(delValsId, 'data_deletealloflist', delOrdId, delKeysId, {}, { LIST: ['lru_vals', valsListId] }, false, false);
    addBlock(delOrdId, 'data_deletealloflist', null, delValsId, {}, { LIST: ['lru_order', orderListId] }, false, false);

    blocks[argR].parent = setCapId;
  }

  // ── Procedure 2: get key: %s ──────────────────────────────────────────
  // set _lru_idx to item# of key in lru_keys
  // if _lru_idx > 0:
  //   set result to lru_vals[_lru_idx]
  //   (update order: delete _lru_idx from order; add _lru_idx to end of order)
  //   Actually order stores slot indices. Instead, let's just find and return.
  //   For simplicity: reorder by deleting from order list the entry matching _lru_idx, adding it back
  // else:
  //   set result to -1
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_get_key`;

    const argR = bid();
    const itemnumId = bid();
    const setIdxId = bid();

    const idxR1 = bid();
    const gt0Id = bid();
    const ifId = bid();

    // then:
    const idxR2 = bid();
    const valItem = bid();
    const setResId = bid();

    // update order: find position of _lru_idx in order list, delete it, add it back
    const idxR3 = bid();
    const ordPosId = bid(); // item# of _lru_idx in order
    const setOrdPosId = bid();
    const ordPosR = bid();
    const gt0Ord = bid();
    const ifOrd = bid();
    const ordPosR2 = bid();
    const delOrdId = bid();
    const idxR4 = bid();
    const addOrdId = bid();

    // else: set result to -1
    const setResNeg1Id = bid();

    addBlock(defId, 'procedures_definition', setIdxId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 200 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'get key: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['key']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['key', null] }, true, false);

    addBlock(argR, 'argument_reporter_string_number', null, itemnumId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(itemnumId, 'data_itemnumoflist', null, setIdxId,
      { ITEM: [3, argR, [10, '']] }, { LIST: ['lru_keys', keysListId] }, false, false);
    addBlock(setIdxId, 'data_setvariableto', ifId, defId,
      { VALUE: [3, itemnumId, [10, '']] }, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);

    addBlock(idxR1, 'data_variable', null, gt0Id, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(gt0Id, 'operator_gt', null, ifId,
      { OPERAND1: [3, idxR1, [12, '_lru_idx', idxVarId]], OPERAND2: [1, [4, '0']] }, {}, false, false);

    // then: get value + update order
    addBlock(idxR2, 'data_variable', null, valItem, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(valItem, 'data_itemoflist', null, setResId,
      { INDEX: [3, idxR2, [7, '']] }, { LIST: ['lru_vals', valsListId] }, false, false);
    addBlock(setResId, 'data_setvariableto', setOrdPosId, ifId,
      { VALUE: [3, valItem, [10, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    // find _lru_idx in order, delete and re-add
    addBlock(idxR3, 'data_variable', null, ordPosId, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(ordPosId, 'data_itemnumoflist', null, setOrdPosId,
      { ITEM: [3, idxR3, [12, '_lru_idx', idxVarId]] }, { LIST: ['lru_order', orderListId] }, false, false);
    addBlock(setOrdPosId, 'data_setvariableto', ifOrd, setResId,
      { VALUE: [3, ordPosId, [10, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(ordPosR, 'data_variable', null, gt0Ord, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(gt0Ord, 'operator_gt', null, ifOrd,
      { OPERAND1: [3, ordPosR, [12, 'result', resultVarId]], OPERAND2: [1, [4, '0']] }, {}, false, false);

    addBlock(ordPosR2, 'data_variable', null, delOrdId, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(delOrdId, 'data_deleteoflist', addOrdId, ifOrd,
      { INDEX: [3, ordPosR2, [7, '']] }, { LIST: ['lru_order', orderListId] }, false, false);
    addBlock(idxR4, 'data_variable', null, addOrdId, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(addOrdId, 'data_addtolist', null, delOrdId,
      { ITEM: [3, idxR4, [12, '_lru_idx', idxVarId]] }, { LIST: ['lru_order', orderListId] }, false, false);

    addBlock(ifOrd, 'control_if', null, setOrdPosId, {
      CONDITION: [2, gt0Ord],
      SUBSTACK: [2, delOrdId],
    }, {}, false, false);

    // then restore result to the actual value
    const idxR5 = bid();
    const valItem2 = bid();
    const setResFinal = bid();
    addBlock(idxR5, 'data_variable', null, valItem2, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(valItem2, 'data_itemoflist', null, setResFinal,
      { INDEX: [3, idxR5, [7, '']] }, { LIST: ['lru_vals', valsListId] }, false, false);
    addBlock(setResFinal, 'data_setvariableto', null, ifOrd,
      { VALUE: [3, valItem2, [10, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[ifOrd].next = setResFinal;
    blocks[setResFinal].parent = ifOrd;
    blocks[idxR5].parent = valItem2;
    blocks[valItem2].parent = setResFinal;

    // else: set result to -1
    addBlock(setResNeg1Id, 'data_setvariableto', null, ifId,
      { VALUE: [1, [10, '-1']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(ifId, 'control_if_else', null, setIdxId, {
      CONDITION: [2, gt0Id],
      SUBSTACK: [2, setResId],
      SUBSTACK2: [2, setResNeg1Id],
    }, {}, false, false);

    blocks[argR].parent = itemnumId;
    blocks[itemnumId].parent = setIdxId;
    blocks[idxR1].parent = gt0Id;
    blocks[gt0Id].parent = ifId;
    blocks[idxR2].parent = valItem;
    blocks[valItem].parent = setResId;
    blocks[setResId].parent = ifId;
    blocks[setResId].next = setOrdPosId;
    blocks[setOrdPosId].parent = setResId;
    blocks[idxR3].parent = ordPosId;
    blocks[ordPosId].parent = setOrdPosId;
    blocks[ordPosR].parent = gt0Ord;
    blocks[gt0Ord].parent = ifOrd;
    blocks[ifOrd].parent = setOrdPosId;
    blocks[ordPosR2].parent = delOrdId;
    blocks[delOrdId].parent = ifOrd;
    blocks[idxR4].parent = addOrdId;
    blocks[addOrdId].parent = delOrdId;
    blocks[setResNeg1Id].parent = ifId;
  }

  // ── Procedure 3: put key: %s value: %s ───────────────────────────────
  // set _lru_idx to item# of key in lru_keys
  // if _lru_idx > 0:
  //   replace lru_vals[_lru_idx] with value (update in-place)
  //   update order (same as get)
  // else:
  //   if length of lru_keys >= _lru_cap:
  //     evict: get oldest = item 1 of lru_order (the slot index)
  //     delete that index from keys, vals, order
  //     -- but deleting shifts indices! This is tricky.
  //     -- Simpler: track by key. Evict the first key in order list.
  //     Actually let's store keys in lru_order directly (not indices).
  //     Then to evict: get key = lru_order[1]; find its index; delete from all 3 lists; delete order[1]
  //   add key to lru_keys, value to lru_vals
  //   add length of lru_keys to lru_order (add the new slot index)
  //
  // Revised approach for order: store key in lru_order (strings)
  // On get/put: delete key from order, add to end
  // On evict: oldest = order[1]; find its index in keys; delete from keys/vals; delete order[1]
  {
    const defId = bid();
    const protoId = bid();
    const argKeyShadow = bid();
    const argValShadow = bid();
    const argKeyProcId = `${spriteId}_put_key`;
    const argValProcId = `${spriteId}_put_val`;

    const argKeyR1 = bid();
    const itemnumId = bid();
    const setIdxId = bid();

    const idxR1 = bid();
    const gt0Id = bid();
    const ifId = bid();

    // then: update existing
    const idxR_rep = bid();
    const argValR1 = bid();
    const repValId = bid();

    // update order: find key in order, delete, add back
    const argKeyR2 = bid();
    const ordPosId = bid();
    const setOrdPosId = bid();
    const ordPosR = bid();
    const gt0Ord = bid();
    const ifOrd = bid();
    const ordPosR2 = bid();
    const delOrdId = bid();
    const argKeyR3 = bid();
    const addOrdId = bid();

    // else: check capacity, maybe evict, then add
    // check capacity
    const lenKeysId = bid();
    const capR1 = bid();
    const gtCapId = bid();
    const ifCapId = bid();

    // evict: oldest key = item 1 of lru_order
    const oldestId = bid();
    const setOldestId = bid(); // set _lru_idx = item# of oldest in lru_keys
    const oldestR1 = bid();
    const itemnumOldId = bid();
    const setIdxOldId = bid();
    const idxOldR = bid();
    const delKeysOldId = bid();
    const idxOldR2 = bid();
    const delValsOldId = bid();
    const delOrdOldId = bid();

    // add new
    const argKeyR4 = bid();
    const addKeyId = bid();
    const argValR2 = bid();
    const addValId = bid();
    const argKeyR5 = bid();
    const addOrdNewId = bid();

    addBlock(defId, 'procedures_definition', setIdxId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 600 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProcId]: [2, argKeyShadow],
      [argValProcId]: [2, argValShadow],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'put key: %s value: %s',
        argumentids: JSON.stringify([argKeyProcId, argValProcId]),
        argumentnames: JSON.stringify(['key', 'value']),
        argumentdefaults: JSON.stringify(['', '']),
        warp: 'false',
      },
    });
    addBlock(argKeyShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['key', null] }, true, false);
    addBlock(argValShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['value', null] }, true, false);

    addBlock(argKeyR1, 'argument_reporter_string_number', null, itemnumId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(itemnumId, 'data_itemnumoflist', null, setIdxId,
      { ITEM: [3, argKeyR1, [10, '']] }, { LIST: ['lru_keys', keysListId] }, false, false);
    addBlock(setIdxId, 'data_setvariableto', ifId, defId,
      { VALUE: [3, itemnumId, [10, '']] }, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);

    addBlock(idxR1, 'data_variable', null, gt0Id, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(gt0Id, 'operator_gt', null, ifId,
      { OPERAND1: [3, idxR1, [12, '_lru_idx', idxVarId]], OPERAND2: [1, [4, '0']] }, {}, false, false);

    // then-branch: update value
    addBlock(idxR_rep, 'data_variable', null, repValId, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(argValR1, 'argument_reporter_string_number', null, repValId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(repValId, 'data_replaceitemoflist', setOrdPosId, ifId,
      { INDEX: [3, idxR_rep, [7, '']], ITEM: [3, argValR1, [10, '']] },
      { LIST: ['lru_vals', valsListId] }, false, false);

    // update order
    addBlock(argKeyR2, 'argument_reporter_string_number', null, ordPosId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(ordPosId, 'data_itemnumoflist', null, setOrdPosId,
      { ITEM: [3, argKeyR2, [10, '']] }, { LIST: ['lru_order', orderListId] }, false, false);
    addBlock(setOrdPosId, 'data_setvariableto', ifOrd, repValId,
      { VALUE: [3, ordPosId, [10, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(ordPosR, 'data_variable', null, gt0Ord, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(gt0Ord, 'operator_gt', null, ifOrd,
      { OPERAND1: [3, ordPosR, [12, 'result', resultVarId]], OPERAND2: [1, [4, '0']] }, {}, false, false);

    addBlock(ordPosR2, 'data_variable', null, delOrdId, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(delOrdId, 'data_deleteoflist', addOrdId, ifOrd,
      { INDEX: [3, ordPosR2, [7, '']] }, { LIST: ['lru_order', orderListId] }, false, false);
    addBlock(argKeyR3, 'argument_reporter_string_number', null, addOrdId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(addOrdId, 'data_addtolist', null, delOrdId,
      { ITEM: [3, argKeyR3, [10, '']] }, { LIST: ['lru_order', orderListId] }, false, false);

    addBlock(ifOrd, 'control_if', null, setOrdPosId, {
      CONDITION: [2, gt0Ord],
      SUBSTACK: [2, delOrdId],
    }, {}, false, false);

    // else branch: evict if needed + add
    // if length >= cap: evict
    addBlock(lenKeysId, 'data_lengthoflist', null, gtCapId, {}, { LIST: ['lru_keys', keysListId] }, false, false);
    addBlock(capR1, 'data_variable', null, gtCapId, {}, { VARIABLE: ['_lru_cap', capVarId] }, false, false);
    addBlock(gtCapId, 'operator_gt', null, ifCapId,
      { OPERAND1: [3, lenKeysId, [6, '']], OPERAND2: [3, capR1, [12, '_lru_cap', capVarId]] }, {}, false, false);
    // use >= → NOT (len < cap) but let's use NOT (cap > len)
    const capR2 = bid();
    const notGt = bid();
    addBlock(capR2, 'data_variable', null, null, {}, { VARIABLE: ['_lru_cap', capVarId] }, false, false);
    const lenKeys2 = bid();
    addBlock(lenKeys2, 'data_lengthoflist', null, null, {}, { LIST: ['lru_keys', keysListId] }, false, false);
    const capGtLen = bid();
    addBlock(capGtLen, 'operator_gt', null, notGt,
      { OPERAND1: [3, capR2, [12, '_lru_cap', capVarId]], OPERAND2: [3, lenKeys2, [6, '']] }, {}, false, false);
    addBlock(notGt, 'operator_not', null, ifCapId, { OPERAND: [2, capGtLen] }, {}, false, false);

    // evict body: oldest key = item 1 of lru_order
    addBlock(oldestId, 'data_itemoflist', null, setOldestId, { INDEX: [1, [7, '1']] }, { LIST: ['lru_order', orderListId] }, false, false);
    addBlock(setOldestId, 'data_setvariableto', setIdxOldId, ifCapId,
      { VALUE: [3, oldestId, [10, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    // set _lru_idx to item# of oldest in lru_keys
    addBlock(oldestR1, 'data_variable', null, itemnumOldId, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(itemnumOldId, 'data_itemnumoflist', null, setIdxOldId,
      { ITEM: [3, oldestR1, [12, 'result', resultVarId]] }, { LIST: ['lru_keys', keysListId] }, false, false);
    addBlock(setIdxOldId, 'data_setvariableto', delKeysOldId, setOldestId,
      { VALUE: [3, itemnumOldId, [10, '']] }, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);

    addBlock(idxOldR, 'data_variable', null, delKeysOldId, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(delKeysOldId, 'data_deleteoflist', delValsOldId, setIdxOldId,
      { INDEX: [3, idxOldR, [7, '']] }, { LIST: ['lru_keys', keysListId] }, false, false);
    addBlock(idxOldR2, 'data_variable', null, delValsOldId, {}, { VARIABLE: ['_lru_idx', idxVarId] }, false, false);
    addBlock(delValsOldId, 'data_deleteoflist', delOrdOldId, delKeysOldId,
      { INDEX: [3, idxOldR2, [7, '']] }, { LIST: ['lru_vals', valsListId] }, false, false);
    addBlock(delOrdOldId, 'data_deleteoflist', null, delValsOldId,
      { INDEX: [1, [7, '1']] }, { LIST: ['lru_order', orderListId] }, false, false);

    addBlock(ifCapId, 'control_if', addKeyId, ifId, {
      CONDITION: [2, notGt],
      SUBSTACK: [2, setOldestId],
    }, {}, false, false);

    // add new entry
    addBlock(argKeyR4, 'argument_reporter_string_number', null, addKeyId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(addKeyId, 'data_addtolist', addValId, ifCapId,
      { ITEM: [3, argKeyR4, [10, '']] }, { LIST: ['lru_keys', keysListId] }, false, false);
    addBlock(argValR2, 'argument_reporter_string_number', null, addValId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(addValId, 'data_addtolist', addOrdNewId, addKeyId,
      { ITEM: [3, argValR2, [10, '']] }, { LIST: ['lru_vals', valsListId] }, false, false);
    addBlock(argKeyR5, 'argument_reporter_string_number', null, addOrdNewId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(addOrdNewId, 'data_addtolist', null, addValId,
      { ITEM: [3, argKeyR5, [10, '']] }, { LIST: ['lru_order', orderListId] }, false, false);

    addBlock(ifId, 'control_if_else', null, setIdxId, {
      CONDITION: [2, gt0Id],
      SUBSTACK: [2, repValId],
      SUBSTACK2: [2, ifCapId],
    }, {}, false, false);

    // fix parents
    blocks[argKeyR1].parent = itemnumId;
    blocks[itemnumId].parent = setIdxId;
    blocks[idxR1].parent = gt0Id;
    blocks[gt0Id].parent = ifId;
    blocks[idxR_rep].parent = repValId;
    blocks[argValR1].parent = repValId;
    blocks[repValId].parent = ifId;
    blocks[setOrdPosId].parent = repValId;
    blocks[argKeyR2].parent = ordPosId;
    blocks[ordPosId].parent = setOrdPosId;
    blocks[ordPosR].parent = gt0Ord;
    blocks[gt0Ord].parent = ifOrd;
    blocks[ifOrd].parent = setOrdPosId;
    blocks[ordPosR2].parent = delOrdId;
    blocks[delOrdId].parent = ifOrd;
    blocks[argKeyR3].parent = addOrdId;
    blocks[addOrdId].parent = delOrdId;

    blocks[lenKeysId].parent = gtCapId;
    blocks[capR2].parent = capGtLen;
    blocks[lenKeys2].parent = capGtLen;
    blocks[capGtLen].parent = notGt;
    blocks[notGt].parent = ifCapId;
    blocks[ifCapId].parent = ifId;
    blocks[oldestId].parent = setOldestId;
    blocks[setOldestId].parent = ifCapId;
    blocks[oldestR1].parent = itemnumOldId;
    blocks[itemnumOldId].parent = setIdxOldId;
    blocks[setIdxOldId].parent = setOldestId;
    blocks[idxOldR].parent = delKeysOldId;
    blocks[delKeysOldId].parent = setIdxOldId;
    blocks[idxOldR2].parent = delValsOldId;
    blocks[delValsOldId].parent = delKeysOldId;
    blocks[delOrdOldId].parent = delValsOldId;
    blocks[argKeyR4].parent = addKeyId;
    blocks[addKeyId].parent = ifCapId;
    blocks[argValR2].parent = addValId;
    blocks[addValId].parent = addKeyId;
    blocks[argKeyR5].parent = addOrdNewId;
    blocks[addOrdNewId].parent = addValId;
  }

  return { lists, variables, blocks };
}
