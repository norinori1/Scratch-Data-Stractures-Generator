export function buildDeque(spriteId, capacity = 4096) {
  const CAPACITY = capacity;
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const itemsListId = `${spriteId}_items`;
  const headVarId = `${spriteId}_head`;
  const tailVarId = `${spriteId}_tail`;
  const sizeVarId = `${spriteId}_size`;
  const resultVarId = `${spriteId}_result`;

  const lists = {
    [itemsListId]: ['items', Array(CAPACITY).fill('')],
  };

  const variables = {
    [headVarId]: ['_dq_head', 0],
    [tailVarId]: ['_dq_tail', 0],
    [sizeVarId]: ['_dq_size', 0],
    [resultVarId]: ['result', 0],
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

  // ── Helpers ────────────────────────────────────────────────────────

  function buildDecrementMod(varName, varId) {
    const vR = mkVar(varName, varId);
    const sub1 = bid();
    const addCap = bid();
    const modCap = bid();
    const setVar = bid();
    addBlock(sub1, 'operator_subtract', null, addCap, { NUM1: [3, vR, [12, varName, varId]], NUM2: [1, [4, '1']] }, {});
    addBlock(addCap, 'operator_add', null, modCap, { NUM1: [3, sub1, [4, '']], NUM2: [1, [4, String(CAPACITY)]] }, {});
    addBlock(modCap, 'operator_mod', null, setVar, { NUM1: [3, addCap, [4, '']], NUM2: [1, [4, String(CAPACITY)]] }, {});
    addBlock(setVar, 'data_setvariableto', null, null, { VALUE: [3, modCap, [4, '']] }, { VARIABLE: [varName, varId] });
    blocks[vR].parent = sub1;
    blocks[sub1].parent = addCap;
    blocks[addCap].parent = modCap;
    blocks[modCap].parent = setVar;
    return { first: sub1, last: setVar };
  }

  function buildIncrementMod(varName, varId) {
    const vR = mkVar(varName, varId);
    const add1 = bid();
    const modCap = bid();
    const setVar = bid();
    addBlock(add1, 'operator_add', null, modCap, { NUM1: [3, vR, [12, varName, varId]], NUM2: [1, [4, '1']] }, {});
    addBlock(modCap, 'operator_mod', null, setVar, { NUM1: [3, add1, [4, '']], NUM2: [1, [4, String(CAPACITY)]] }, {});
    addBlock(setVar, 'data_setvariableto', null, null, { VALUE: [3, modCap, [4, '']] }, { VARIABLE: [varName, varId] });
    blocks[vR].parent = add1;
    blocks[add1].parent = modCap;
    blocks[modCap].parent = setVar;
    return { first: add1, last: setVar };
  }

  function buildReplaceItem(varName, varId, valInput) {
    const vR = mkVar(varName, varId);
    const add1 = bid();
    const repOp = bid();
    addBlock(add1, 'operator_add', null, repOp, { NUM1: [3, vR, [12, varName, varId]], NUM2: [1, [4, '1']] }, {});
    addBlock(repOp, 'data_replaceitemoflist', null, null, { INDEX: [3, add1, [7, '']], ITEM: valInput }, { LIST: ['items', itemsListId] });
    blocks[vR].parent = add1;
    blocks[add1].parent = repOp;
    return { first: add1, last: repOp };
  }

  function buildGetItem(varName, varId) {
    const vR = mkVar(varName, varId);
    const add1 = bid();
    const itemOf = bid();
    addBlock(add1, 'operator_add', null, itemOf, { NUM1: [3, vR, [12, varName, varId]], NUM2: [1, [4, '1']] }, {});
    addBlock(itemOf, 'data_itemoflist', null, null, { INDEX: [3, add1, [7, '']] }, { LIST: ['items', itemsListId] });
    blocks[vR].parent = add1;
    blocks[add1].parent = itemOf;
    return { first: add1, last: itemOf };
  }

  // ── Procedure 1: push-front value: %s ────────────────────────────────
  {
    const argProcId = `${spriteId}_pf_val`;
    const argR = bid();
    addBlock(argR, 'argument_reporter_string_number', null, null, {}, { VALUE: ['value', null] }, false, false);

    const { first: decHead, last: setHead } = buildDecrementMod('_dq_head', headVarId);
    const { first: repHead, last: repOp } = buildReplaceItem('_dq_head', headVarId, [3, argR, [10, '']]);
    blocks[argR].parent = repOp;
    const incSize = bid();
    addBlock(incSize, 'data_changevariableby', null, null, { VALUE: [1, [4, '1']] }, { VARIABLE: ['_dq_size', sizeVarId] });

    blocks[setHead].next = repHead;
    blocks[repHead].parent = setHead;
    blocks[repOp].next = incSize;
    blocks[incSize].parent = repOp;

    makeProc('push-front value: %s', ['value'], 20, decHead, [argProcId]);
  }

  // ── Procedure 2: push-back value: %s ─────────────────────────────────
  {
    const argProcId = `${spriteId}_pb_val`;
    const argR = bid();
    addBlock(argR, 'argument_reporter_string_number', null, null, {}, { VALUE: ['value', null] }, false, false);

    const { first: repTail, last: repOp } = buildReplaceItem('_dq_tail', tailVarId, [3, argR, [10, '']]);
    blocks[argR].parent = repOp;
    const { first: incTail, last: setTail } = buildIncrementMod('_dq_tail', tailVarId);
    const incSize = bid();
    addBlock(incSize, 'data_changevariableby', null, null, { VALUE: [1, [4, '1']] }, { VARIABLE: ['_dq_size', sizeVarId] });

    blocks[repOp].next = incTail;
    blocks[incTail].parent = repOp;
    blocks[setTail].next = incSize;
    blocks[incSize].parent = setTail;

    makeProc('push-back value: %s', ['value'], 200, repTail, [argProcId]);
  }

  // ── Procedure 3: pop-front ────────────────────────────────────────────
  {
    const { first: getItemFirst, last: itemOf } = buildGetItem('_dq_head', headVarId);
    const setRes = bid();
    addBlock(setRes, 'data_setvariableto', null, null, { VALUE: [3, itemOf, [10, '']] }, { VARIABLE: ['result', resultVarId] });
    blocks[itemOf].parent = setRes;

    const { first: incHead, last: setHead } = buildIncrementMod('_dq_head', headVarId);
    const decSize = bid();
    addBlock(decSize, 'data_changevariableby', null, null, { VALUE: [1, [4, '-1']] }, { VARIABLE: ['_dq_size', sizeVarId] });

    blocks[setRes].next = incHead;
    blocks[incHead].parent = setRes;
    blocks[setHead].next = decSize;
    blocks[decSize].parent = setHead;

    makeProc('pop-front', [], 380, getItemFirst, []);
  }

  // ── Procedure 4: pop-back ─────────────────────────────────────────────
  {
    const { first: decTail, last: setTail } = buildDecrementMod('_dq_tail', tailVarId);
    const { first: getItemFirst, last: itemOf } = buildGetItem('_dq_tail', tailVarId);
    const setRes = bid();
    addBlock(setRes, 'data_setvariableto', null, null, { VALUE: [3, itemOf, [10, '']] }, { VARIABLE: ['result', resultVarId] });
    blocks[itemOf].parent = setRes;

    const decSize = bid();
    addBlock(decSize, 'data_changevariableby', null, null, { VALUE: [1, [4, '-1']] }, { VARIABLE: ['_dq_size', sizeVarId] });

    blocks[setTail].next = getItemFirst;
    blocks[getItemFirst].parent = setTail;
    blocks[setRes].next = decSize;
    blocks[decSize].parent = setRes;

    makeProc('pop-back', [], 560, decTail, []);
  }

  // ── Procedure 5: size ────────────────────────────────────────────────
  {
    const sizeR = mkVar('_dq_size', sizeVarId);
    const setRes = bid();
    addBlock(setRes, 'data_setvariableto', null, null, { VALUE: [3, sizeR, [12, '_dq_size', sizeVarId]] }, { VARIABLE: ['result', resultVarId] });
    blocks[sizeR].parent = setRes;

    makeProc('size', [], 750, setRes, []);
  }

  // ── Procedure 6: clear ───────────────────────────────────────────────
  {
    const delItems = bid();
    addBlock(delItems, 'data_deletealloflist', null, null, {}, { LIST: ['items', itemsListId] });

    const addItem = bid();
    addBlock(addItem, 'data_addtolist', null, null, { ITEM: [1, [10, '']] }, { LIST: ['items', itemsListId] });
    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, delItems, { TIMES: [1, [4, String(CAPACITY)]], SUBSTACK: [2, addItem] }, {});
    blocks[delItems].next = repeatId;
    blocks[repeatId].parent = delItems;
    blocks[addItem].parent = repeatId;

    const setHead0 = bid();
    const setTail0 = bid();
    const setSize0 = bid();
    addBlock(setHead0, 'data_setvariableto', setTail0, repeatId, { VALUE: [1, [4, '0']] }, { VARIABLE: ['_dq_head', headVarId] });
    addBlock(setTail0, 'data_setvariableto', setSize0, setHead0, { VALUE: [1, [4, '0']] }, { VARIABLE: ['_dq_tail', tailVarId] });
    addBlock(setSize0, 'data_setvariableto', null, setTail0, { VALUE: [1, [4, '0']] }, { VARIABLE: ['_dq_size', sizeVarId] });
    blocks[repeatId].next = setHead0;
    blocks[setHead0].parent = repeatId;

    makeProc('clear', [], 900, delItems, []);
  }

  return { lists, variables, blocks };
}
