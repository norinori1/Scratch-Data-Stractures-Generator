export function buildHashset(spriteId) {
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

  // ── Procedure 1: add item: %s ─────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadowId = bid();
    const argProcId = `${spriteId}_add_item`;

    const argR1 = bid();
    const containsId = bid();
    const notId = bid();
    const ifId = bid();
    const argR2 = bid();
    const addId = bid();

    addBlock(defId, 'procedures_definition', ifId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argProcId]: [2, argShadowId],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'add item: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['item']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadowId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['item', null] }, true, false);

    addBlock(argR1, 'argument_reporter_string_number', null, containsId, {}, { VALUE: ['item', null] }, false, false);
    addBlock(containsId, 'data_listcontainsitem', null, notId,
      { ITEM: [3, argR1, [10, '']] },
      { LIST: ['items', itemsListId] }, false, false);
    addBlock(notId, 'operator_not', null, ifId,
      { OPERAND: [2, containsId] }, {}, false, false);

    addBlock(argR2, 'argument_reporter_string_number', null, addId, {}, { VALUE: ['item', null] }, false, false);
    addBlock(addId, 'data_addtolist', null, ifId,
      { ITEM: [3, argR2, [10, '']] },
      { LIST: ['items', itemsListId] }, false, false);

    addBlock(ifId, 'control_if', null, defId, {
      CONDITION: [2, notId],
      SUBSTACK: [2, addId],
    }, {}, false, false);

    blocks[argR1].parent = containsId;
    blocks[containsId].parent = notId;
    blocks[notId].parent = ifId;
    blocks[argR2].parent = addId;
    blocks[addId].parent = ifId;
  }

  // ── Procedure 2: contains item: %s ───────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadowId = bid();
    const argProcId = `${spriteId}_cont_item`;

    const argR1 = bid();
    const containsId = bid();
    const ifId = bid();
    const setRes1Id = bid();
    const setRes0Id = bid();

    addBlock(defId, 'procedures_definition', ifId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 250 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argProcId]: [2, argShadowId],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'contains item: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['item']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadowId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['item', null] }, true, false);

    addBlock(argR1, 'argument_reporter_string_number', null, containsId, {}, { VALUE: ['item', null] }, false, false);
    addBlock(containsId, 'data_listcontainsitem', null, ifId,
      { ITEM: [3, argR1, [10, '']] },
      { LIST: ['items', itemsListId] }, false, false);

    addBlock(setRes1Id, 'data_setvariableto', null, ifId, { VALUE: [1, [10, '1']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(setRes0Id, 'data_setvariableto', null, ifId, { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(ifId, 'control_if_else', null, defId, {
      CONDITION: [2, containsId],
      SUBSTACK: [2, setRes1Id],
      SUBSTACK2: [2, setRes0Id],
    }, {}, false, false);

    blocks[argR1].parent = containsId;
    blocks[containsId].parent = ifId;
    blocks[setRes1Id].parent = ifId;
    blocks[setRes0Id].parent = ifId;
  }

  // ── Procedure 3: remove item: %s ─────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadowId = bid();
    const argProcId = `${spriteId}_rem_item`;

    const argR1 = bid();
    const itemnumId = bid();
    const setResId = bid();
    const resVarR1 = bid();
    const gtId = bid();
    const ifId = bid();
    const resVarR2 = bid();
    const delId = bid();

    addBlock(defId, 'procedures_definition', setResId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 480 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argProcId]: [2, argShadowId],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'remove item: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['item']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadowId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['item', null] }, true, false);

    addBlock(argR1, 'argument_reporter_string_number', null, itemnumId, {}, { VALUE: ['item', null] }, false, false);
    addBlock(itemnumId, 'data_itemnumoflist', null, setResId,
      { ITEM: [3, argR1, [10, '']] },
      { LIST: ['items', itemsListId] }, false, false);

    addBlock(setResId, 'data_setvariableto', ifId, defId,
      { VALUE: [3, itemnumId, [10, '']] },
      { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(resVarR1, 'data_variable', null, gtId, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(gtId, 'operator_gt', null, ifId,
      { OPERAND1: [3, resVarR1, [12, 'result', resultVarId]], OPERAND2: [1, [4, '0']] },
      {}, false, false);

    addBlock(resVarR2, 'data_variable', null, delId, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(delId, 'data_deleteoflist', null, ifId,
      { INDEX: [3, resVarR2, [7, '']] },
      { LIST: ['items', itemsListId] }, false, false);

    addBlock(ifId, 'control_if', null, setResId, {
      CONDITION: [2, gtId],
      SUBSTACK: [2, delId],
    }, {}, false, false);

    blocks[itemnumId].parent = setResId;
    blocks[argR1].parent = itemnumId;
    blocks[setResId].next = ifId;
    blocks[ifId].parent = defId;
    blocks[resVarR1].parent = gtId;
    blocks[gtId].parent = ifId;
    blocks[resVarR2].parent = delId;
    blocks[delId].parent = ifId;
  }

  // ── Procedure 4: size ────────────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const lenId = bid();
    const setResId = bid();

    addBlock(defId, 'procedures_definition', setResId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 680 });
    addBlock(protoId, 'procedures_prototype', null, defId, {}, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'size',
        argumentids: '[]',
        argumentnames: '[]',
        argumentdefaults: '[]',
        warp: 'false',
      },
    });

    addBlock(lenId, 'data_lengthoflist', null, setResId, {}, { LIST: ['items', itemsListId] }, false, false);
    addBlock(setResId, 'data_setvariableto', null, defId,
      { VALUE: [3, lenId, [6, '']] },
      { VARIABLE: ['result', resultVarId] }, false, false);

    blocks[lenId].parent = setResId;
  }

  return { lists, variables, blocks };
}
