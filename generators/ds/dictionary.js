export function buildDictionary(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const keysListId = `${spriteId}_keys`;
  const valsListId = `${spriteId}_vals`;
  const resultVarId = `${spriteId}_result`;
  const iVarId = `${spriteId}_i`;

  const lists = {
    [keysListId]: ['keys', []],
    [valsListId]: ['values', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
    [iVarId]: ['_dict_i', 0],
  };

  const blocks = {};

  // Helper: add a block
  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // ── Procedure 1: set key: %s value: %s ──────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argKeyId = bid();   // shadow arg for proto
    const argValId = bid();   // shadow arg for proto
    const argKeyProc = `${spriteId}_set_key`;
    const argValProc = `${spriteId}_set_val`;

    // seti = set _dict_i to (item # of key in keys)
    const itemnumId = bid();
    const argKeyR1 = bid();
    const setIId = bid();

    // gt = _dict_i > 0
    const iVarR1 = bid();
    const gtId = bid();

    // if-else
    const ifId = bid();

    // then: replace item _dict_i of values with value
    const iVarR2 = bid();
    const replaceId = bid();
    const argValR1 = bid();

    // else: add key to keys, add value to values
    const addKeyId = bid();
    const argKeyR2 = bid();
    const addValId = bid();
    const argValR2 = bid();

    addBlock(defId, 'procedures_definition', setIId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });

    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProc]: [2, argKeyId],
      [argValProc]: [2, argValId],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'set key: %s value: %s',
        argumentids: JSON.stringify([argKeyProc, argValProc]),
        argumentnames: JSON.stringify(['key', 'value']),
        argumentdefaults: JSON.stringify(['', '']),
        warp: 'false',
      },
    });
    addBlock(argKeyId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['key', null] }, true, false);
    addBlock(argValId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['value', null] }, true, false);

    // argKeyR1: reporter for "key" used in itemnumId
    addBlock(argKeyR1, 'argument_reporter_string_number', null, itemnumId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(itemnumId, 'data_itemnumoflist', null, setIId,
      { ITEM: [3, argKeyR1, [10, '']] },
      { LIST: ['keys', keysListId] }, false, false);

    addBlock(setIId, 'data_setvariableto', ifId, defId,
      { VALUE: [3, itemnumId, [10, '']] },
      { VARIABLE: ['_dict_i', iVarId] }, false, false);

    // fix parents
    blocks[itemnumId].parent = setIId;
    blocks[argKeyR1].parent = itemnumId;

    // gt: _dict_i > 0
    addBlock(iVarR1, 'data_variable', null, gtId, {}, { VARIABLE: ['_dict_i', iVarId] }, false, false);
    addBlock(gtId, 'operator_gt', null, ifId,
      { OPERAND1: [3, iVarR1, [12, '_dict_i', iVarId]], OPERAND2: [1, [4, '0']] },
      {}, false, false);

    // then: replace item _dict_i of values with value
    addBlock(iVarR2, 'data_variable', null, replaceId, {}, { VARIABLE: ['_dict_i', iVarId] }, false, false);
    addBlock(argValR1, 'argument_reporter_string_number', null, replaceId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(replaceId, 'data_replaceitemoflist', null, ifId,
      { INDEX: [3, iVarR2, [7, '']], ITEM: [3, argValR1, [10, '']] },
      { LIST: ['values', valsListId] }, false, false);

    // else: add key then value
    addBlock(argKeyR2, 'argument_reporter_string_number', null, addKeyId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(addKeyId, 'data_addtolist', addValId, ifId,
      { ITEM: [3, argKeyR2, [10, '']] },
      { LIST: ['keys', keysListId] }, false, false);
    blocks[argKeyR2].parent = addKeyId;

    addBlock(argValR2, 'argument_reporter_string_number', null, addValId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(addValId, 'data_addtolist', null, addKeyId,
      { ITEM: [3, argValR2, [10, '']] },
      { LIST: ['values', valsListId] }, false, false);
    blocks[argValR2].parent = addValId;

    addBlock(ifId, 'control_if_else', null, setIId, {
      CONDITION: [2, gtId],
      SUBSTACK: [2, replaceId],
      SUBSTACK2: [2, addKeyId],
    }, {}, false, false);

    blocks[setIId].next = ifId;
    blocks[iVarR1].parent = gtId;
    blocks[gtId].parent = ifId;
    blocks[iVarR2].parent = replaceId;
    blocks[argValR1].parent = replaceId;
    blocks[replaceId].parent = ifId;
    blocks[addKeyId].parent = ifId;
    blocks[addValId].parent = addKeyId;
    blocks[ifId].parent = defId;
  }

  // ── Procedure 2: get key: %s ──────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argKeyId = bid();
    const argKeyProc = `${spriteId}_get_key`;

    const itemnumId = bid();
    const argKeyR1 = bid();
    const setIId = bid();

    const iVarR1 = bid();
    const itemofId = bid();
    const iVarR2 = bid();
    const setResId = bid();

    addBlock(defId, 'procedures_definition', setIId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 300 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProc]: [2, argKeyId],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'get key: %s',
        argumentids: JSON.stringify([argKeyProc]),
        argumentnames: JSON.stringify(['key']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argKeyId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['key', null] }, true, false);

    addBlock(argKeyR1, 'argument_reporter_string_number', null, itemnumId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(itemnumId, 'data_itemnumoflist', null, setIId,
      { ITEM: [3, argKeyR1, [10, '']] },
      { LIST: ['keys', keysListId] }, false, false);

    addBlock(setIId, 'data_setvariableto', setResId, defId,
      { VALUE: [3, itemnumId, [10, '']] },
      { VARIABLE: ['_dict_i', iVarId] }, false, false);

    addBlock(iVarR2, 'data_variable', null, itemofId, {}, { VARIABLE: ['_dict_i', iVarId] }, false, false);
    addBlock(itemofId, 'data_itemoflist', null, setResId,
      { INDEX: [3, iVarR2, [7, '']] },
      { LIST: ['values', valsListId] }, false, false);

    addBlock(setResId, 'data_setvariableto', null, setIId,
      { VALUE: [3, itemofId, [10, '']] },
      { VARIABLE: ['result', resultVarId] }, false, false);

    blocks[itemnumId].parent = setIId;
    blocks[argKeyR1].parent = itemnumId;
    blocks[itemofId].parent = setResId;
    blocks[iVarR2].parent = itemofId;
    blocks[setResId].parent = setIId;
  }

  // ── Procedure 3: contains key: %s ────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argKeyId = bid();
    const argKeyProc = `${spriteId}_contains_key`;

    const argKeyR1 = bid();
    const containsId = bid();
    const ifId = bid();
    const setRes1Id = bid();
    const setRes0Id = bid();

    addBlock(defId, 'procedures_definition', ifId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 500 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProc]: [2, argKeyId],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'contains key: %s',
        argumentids: JSON.stringify([argKeyProc]),
        argumentnames: JSON.stringify(['key']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argKeyId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['key', null] }, true, false);

    addBlock(argKeyR1, 'argument_reporter_string_number', null, containsId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(containsId, 'data_listcontainsitem', null, ifId,
      { ITEM: [3, argKeyR1, [10, '']] },
      { LIST: ['keys', keysListId] }, false, false);

    addBlock(setRes1Id, 'data_setvariableto', null, ifId,
      { VALUE: [1, [10, '1']] },
      { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(setRes0Id, 'data_setvariableto', null, ifId,
      { VALUE: [1, [10, '0']] },
      { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(ifId, 'control_if_else', null, defId, {
      CONDITION: [2, containsId],
      SUBSTACK: [2, setRes1Id],
      SUBSTACK2: [2, setRes0Id],
    }, {}, false, false);

    blocks[argKeyR1].parent = containsId;
    blocks[containsId].parent = ifId;
    blocks[setRes1Id].parent = ifId;
    blocks[setRes0Id].parent = ifId;
  }

  // ── Procedure 4: delete key: %s ──────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argKeyId = bid();
    const argKeyProc = `${spriteId}_del_key`;

    const itemnumId = bid();
    const argKeyR1 = bid();
    const setIId = bid();

    const iVarR1 = bid();
    const gtId = bid();
    const ifId = bid();
    const iVarR2 = bid();
    const delKeysId = bid();
    const iVarR3 = bid();
    const delValsId = bid();

    addBlock(defId, 'procedures_definition', setIId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 700 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProc]: [2, argKeyId],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'delete key: %s',
        argumentids: JSON.stringify([argKeyProc]),
        argumentnames: JSON.stringify(['key']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argKeyId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['key', null] }, true, false);

    addBlock(argKeyR1, 'argument_reporter_string_number', null, itemnumId, {}, { VALUE: ['key', null] }, false, false);
    addBlock(itemnumId, 'data_itemnumoflist', null, setIId,
      { ITEM: [3, argKeyR1, [10, '']] },
      { LIST: ['keys', keysListId] }, false, false);

    addBlock(setIId, 'data_setvariableto', ifId, defId,
      { VALUE: [3, itemnumId, [10, '']] },
      { VARIABLE: ['_dict_i', iVarId] }, false, false);

    addBlock(iVarR1, 'data_variable', null, gtId, {}, { VARIABLE: ['_dict_i', iVarId] }, false, false);
    addBlock(gtId, 'operator_gt', null, ifId,
      { OPERAND1: [3, iVarR1, [12, '_dict_i', iVarId]], OPERAND2: [1, [4, '0']] },
      {}, false, false);

    addBlock(iVarR2, 'data_variable', null, delKeysId, {}, { VARIABLE: ['_dict_i', iVarId] }, false, false);
    addBlock(delKeysId, 'data_deleteoflist', delValsId, ifId,
      { INDEX: [3, iVarR2, [7, '']] },
      { LIST: ['keys', keysListId] }, false, false);

    addBlock(iVarR3, 'data_variable', null, delValsId, {}, { VARIABLE: ['_dict_i', iVarId] }, false, false);
    addBlock(delValsId, 'data_deleteoflist', null, delKeysId,
      { INDEX: [3, iVarR3, [7, '']] },
      { LIST: ['values', valsListId] }, false, false);

    addBlock(ifId, 'control_if', null, setIId, {
      CONDITION: [2, gtId],
      SUBSTACK: [2, delKeysId],
    }, {}, false, false);

    blocks[itemnumId].parent = setIId;
    blocks[argKeyR1].parent = itemnumId;
    blocks[setIId].next = ifId;
    blocks[ifId].parent = defId;
    blocks[iVarR1].parent = gtId;
    blocks[gtId].parent = ifId;
    blocks[iVarR2].parent = delKeysId;
    blocks[delKeysId].parent = ifId;
    blocks[iVarR3].parent = delValsId;
    blocks[delValsId].parent = delKeysId;
  }

  // ── Procedure 5: clear ───────────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const delKeysId = bid();
    const delValsId = bid();

    addBlock(defId, 'procedures_definition', delKeysId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 950 });
    addBlock(protoId, 'procedures_prototype', null, defId, {}, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'clear',
        argumentids: '[]',
        argumentnames: '[]',
        argumentdefaults: '[]',
        warp: 'false',
      },
    });

    addBlock(delKeysId, 'data_deletealloflist', delValsId, defId, {}, { LIST: ['keys', keysListId] }, false, false);
    addBlock(delValsId, 'data_deletealloflist', null, delKeysId, {}, { LIST: ['values', valsListId] }, false, false);
  }

  return { lists, variables, blocks };
}
