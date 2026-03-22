export function buildDeque(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const itemsListId = `${spriteId}_items`;
  const resultVarId = `${spriteId}_result`;

  const lists = {
    [itemsListId]: ['items', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  function makeProc(proccode, argNames, defY, bodyFirst, argProcIds) {
    const defId = bid();
    const protoId = bid();
    const protoInputs = {};
    const argShadows = {};

    argProcIds.forEach((apId, idx) => {
      const shId = bid();
      argShadows[apId] = shId;
      protoInputs[apId] = [2, shId];
      addBlock(shId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: [argNames[idx], null] }, true, false);
    });

    addBlock(defId, 'procedures_definition', bodyFirst, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: defY });
    addBlock(protoId, 'procedures_prototype', null, defId, protoInputs, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode,
        argumentids: JSON.stringify(argProcIds),
        argumentnames: JSON.stringify(argNames),
        argumentdefaults: JSON.stringify(argNames.map(() => '')),
        warp: 'false',
      },
    });

    return { defId, protoId };
  }

  // ── Procedure 1: push-front value: %s ────────────────────────────────
  {
    const argProcId = `${spriteId}_pf_val`;
    const argR = bid();
    const insertId = bid();

    const { defId } = makeProc('push-front value: %s', ['value'], 20, insertId, [argProcId]);

    addBlock(argR, 'argument_reporter_string_number', null, insertId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(insertId, 'data_insertatlist', null, defId,
      { ITEM: [3, argR, [10, '']], INDEX: [1, [7, '1']] },
      { LIST: ['items', itemsListId] }, false, false);

    blocks[argR].parent = insertId;
  }

  // ── Procedure 2: push-back value: %s ─────────────────────────────────
  {
    const argProcId = `${spriteId}_pb_val`;
    const argR = bid();
    const addId = bid();

    const { defId } = makeProc('push-back value: %s', ['value'], 200, addId, [argProcId]);

    addBlock(argR, 'argument_reporter_string_number', null, addId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(addId, 'data_addtolist', null, defId,
      { ITEM: [3, argR, [10, '']] },
      { LIST: ['items', itemsListId] }, false, false);

    blocks[argR].parent = addId;
  }

  // ── Procedure 3: pop-front ────────────────────────────────────────────
  {
    const itemId = bid();
    const setResId = bid();
    const delId = bid();

    const { defId } = makeProc('pop-front', [], 380, setResId, []);

    addBlock(itemId, 'data_itemoflist', null, setResId,
      { INDEX: [1, [7, '1']] },
      { LIST: ['items', itemsListId] }, false, false);

    addBlock(setResId, 'data_setvariableto', delId, defId,
      { VALUE: [3, itemId, [10, '']] },
      { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(delId, 'data_deleteoflist', null, setResId,
      { INDEX: [1, [7, '1']] },
      { LIST: ['items', itemsListId] }, false, false);

    blocks[itemId].parent = setResId;
    blocks[setResId].next = delId;
    blocks[delId].parent = setResId;
  }

  // ── Procedure 4: pop-back ─────────────────────────────────────────────
  {
    const lenId1 = bid();
    const itemId = bid();
    const setResId = bid();
    const lenId2 = bid();
    const delId = bid();

    const { defId } = makeProc('pop-back', [], 560, setResId, []);

    addBlock(lenId1, 'data_lengthoflist', null, itemId, {}, { LIST: ['items', itemsListId] }, false, false);
    addBlock(itemId, 'data_itemoflist', null, setResId,
      { INDEX: [3, lenId1, [6, '']] },
      { LIST: ['items', itemsListId] }, false, false);

    addBlock(setResId, 'data_setvariableto', delId, defId,
      { VALUE: [3, itemId, [10, '']] },
      { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(lenId2, 'data_lengthoflist', null, delId, {}, { LIST: ['items', itemsListId] }, false, false);
    addBlock(delId, 'data_deleteoflist', null, setResId,
      { INDEX: [3, lenId2, [6, '']] },
      { LIST: ['items', itemsListId] }, false, false);

    blocks[lenId1].parent = itemId;
    blocks[itemId].parent = setResId;
    blocks[setResId].next = delId;
    blocks[delId].parent = setResId;
    blocks[lenId2].parent = delId;
  }

  // ── Procedure 5: size ────────────────────────────────────────────────
  {
    const lenId = bid();
    const setResId = bid();

    const { defId } = makeProc('size', [], 750, setResId, []);

    addBlock(lenId, 'data_lengthoflist', null, setResId, {}, { LIST: ['items', itemsListId] }, false, false);
    addBlock(setResId, 'data_setvariableto', null, defId,
      { VALUE: [3, lenId, [6, '']] },
      { VARIABLE: ['result', resultVarId] }, false, false);

    blocks[lenId].parent = setResId;
  }

  return { lists, variables, blocks };
}
