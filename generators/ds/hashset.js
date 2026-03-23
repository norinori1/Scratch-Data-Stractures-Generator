/**
 * HashSet – O(1) open-addressing hash table (linear probing)
 *
 * Same polynomial rolling hash as Dictionary:
 *   h = (h*31 + charCode) mod TABLE_SIZE
 * charCode looked up via pre-populated _ht_chars (ASCII 32-126).
 *
 * Slot states in _hs_state:
 *   "0" = empty   "1" = occupied   "2" = tombstone (deleted)
 */
export function buildHashset(spriteId) {
  const TABLE_SIZE = 64;
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  // ── List / Variable IDs ──────────────────────────────────────────────
  const itemsListId = `${spriteId}_items`;
  const stateListId = `${spriteId}_state`;
  const charsListId = `${spriteId}_chars`;

  const resultVarId = `${spriteId}_result`;
  const hVarId      = `${spriteId}_ht_h`;
  const iVarId      = `${spriteId}_ht_i`;
  const slotVarId   = `${spriteId}_ht_slot`;
  const codeVarId   = `${spriteId}_ht_code`;
  const tsVarId     = `${spriteId}_ht_ts`;

  const ASCII_CHARS = [];
  for (let i = 32; i <= 126; i++) ASCII_CHARS.push(String.fromCharCode(i));

  const lists = {
    [itemsListId]: ['items',     Array(TABLE_SIZE).fill('')],
    [stateListId]: ['_hs_state', Array(TABLE_SIZE).fill('0')],
    [charsListId]: ['_ht_chars', ASCII_CHARS],
  };

  const variables = {
    [resultVarId]: ['result',    0],
    [hVarId]:      ['_ht_h',    0],
    [iVarId]:      ['_ht_i',    0],
    [slotVarId]:   ['_ht_slot', 0],
    [codeVarId]:   ['_ht_code', 0],
    [tsVarId]:     ['_ht_ts',   0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields,
                    shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // ── Low-level factories ──────────────────────────────────────────────

  function buildStop() {
    const id = bid();
    addBlock(id, 'control_stop', null, null, {},
      { STOP_OPTION: ['this script', null] }, false, false,
      { mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
    return id;
  }

  function mkVar(name, varId) {
    const id = bid();
    addBlock(id, 'data_variable', null, null, {}, { VARIABLE: [name, varId] });
    return id;
  }

  function buildStateEq(val) {
    const slotR  = mkVar('_ht_slot', slotVarId);
    const itemOp = bid();
    const eqOp   = bid();
    addBlock(itemOp, 'data_itemoflist', null, eqOp,
      { INDEX: [3, slotR, [7, '']] }, { LIST: ['_hs_state', stateListId] });
    addBlock(eqOp, 'operator_equals', null, null,
      { OPERAND1: [3, itemOp, [10, '']], OPERAND2: [1, [10, val]] }, {});
    blocks[slotR].parent  = itemOp;
    blocks[itemOp].parent = eqOp;
    return eqOp;
  }

  function buildItemEq(argProcId) {
    const slotR  = mkVar('_ht_slot', slotVarId);
    const itemOp = bid();
    const argR   = bid();
    const eqOp   = bid();
    addBlock(itemOp, 'data_itemoflist', null, eqOp,
      { INDEX: [3, slotR, [7, '']] }, { LIST: ['items', itemsListId] });
    addBlock(argR, 'argument_reporter_string_number', null, eqOp, {},
      { VALUE: [argProcId, null] });
    addBlock(eqOp, 'operator_equals', null, null,
      { OPERAND1: [3, itemOp, [10, '']], OPERAND2: [3, argR, [10, '']] }, {});
    blocks[slotR].parent  = itemOp;
    blocks[itemOp].parent = eqOp;
    blocks[argR].parent   = eqOp;
    return eqOp;
  }

  function buildRepState(val) {
    const slotR = mkVar('_ht_slot', slotVarId);
    const repOp = bid();
    addBlock(repOp, 'data_replaceitemoflist', null, null,
      { INDEX: [3, slotR, [7, '']], ITEM: [1, [10, val]] },
      { LIST: ['_hs_state', stateListId] });
    blocks[slotR].parent = repOp;
    return repOp;
  }

  function buildRepItemArg(argProcId) {
    const slotR = mkVar('_ht_slot', slotVarId);
    const argR  = bid();
    const repOp = bid();
    addBlock(argR, 'argument_reporter_string_number', null, null, {},
      { VALUE: [argProcId, null] });
    addBlock(repOp, 'data_replaceitemoflist', null, null,
      { INDEX: [3, slotR, [7, '']], ITEM: [3, argR, [10, '']] },
      { LIST: ['items', itemsListId] });
    blocks[slotR].parent = repOp;
    blocks[argR].parent  = repOp;
    return repOp;
  }

  function buildAdvanceSlot() {
    const slotR1 = mkVar('_ht_slot', slotVarId);
    const modOp  = bid();
    const addOne = bid();
    const setSl  = bid();
    addBlock(modOp, 'operator_mod', null, addOne,
      { NUM1: [3, slotR1, [12, '_ht_slot', slotVarId]], NUM2: [1, [4, String(TABLE_SIZE)]] }, {});
    addBlock(addOne, 'operator_add', null, setSl,
      { NUM1: [3, modOp, [4, '']], NUM2: [1, [4, '1']] }, {});
    addBlock(setSl, 'data_setvariableto', null, null,
      { VALUE: [3, addOne, [4, '']] }, { VARIABLE: ['_ht_slot', slotVarId] });
    blocks[slotR1].parent = modOp;
    blocks[modOp].parent  = addOne;
    blocks[addOne].parent = setSl;
    return setSl;
  }

  // ── Hash computation ─────────────────────────────────────────────────
  function buildHashAndSlot(argProcId, defParentId) {
    const setH0 = bid();
    const setI1 = bid();
    addBlock(setH0, 'data_setvariableto', setI1, defParentId,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_ht_h', hVarId] });
    addBlock(setI1, 'data_setvariableto', null, setH0,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_ht_i', iVarId] });
    blocks[setH0].next = setI1;

    const condI    = mkVar('_ht_i', iVarId);
    const condArgR = bid();
    const condLen  = bid();
    const condGt   = bid();
    addBlock(condArgR, 'argument_reporter_string_number', null, condLen, {},
      { VALUE: [argProcId, null] });
    addBlock(condLen, 'operator_length', null, condGt,
      { STRING: [3, condArgR, [10, '']] }, {});
    addBlock(condGt, 'operator_gt', null, null,
      { OPERAND1: [3, condI, [12, '_ht_i', iVarId]], OPERAND2: [3, condLen, [4, '']] }, {});
    blocks[condArgR].parent = condLen;
    blocks[condLen].parent  = condGt;
    blocks[condI].parent    = condGt;

    const letI    = mkVar('_ht_i', iVarId);
    const letArgR = bid();
    const letOp   = bid();
    const itmNum  = bid();
    const setCode = bid();
    addBlock(letArgR, 'argument_reporter_string_number', null, letOp, {},
      { VALUE: [argProcId, null] });
    addBlock(letOp, 'operator_letter_of', null, itmNum,
      { LETTER: [3, letI, [6, '']], STRING: [3, letArgR, [10, '']] }, {});
    addBlock(itmNum, 'data_itemnumoflist', null, setCode,
      { ITEM: [3, letOp, [10, '']] }, { LIST: ['_ht_chars', charsListId] });
    addBlock(setCode, 'data_setvariableto', null, null,
      { VALUE: [3, itmNum, [10, '']] }, { VARIABLE: ['_ht_code', codeVarId] });
    blocks[letI].parent    = letOp;
    blocks[letArgR].parent = letOp;
    blocks[letOp].parent   = itmNum;
    blocks[itmNum].parent  = setCode;

    const hR1     = mkVar('_ht_h', hVarId);
    const mul31   = bid();
    const codeR   = mkVar('_ht_code', codeVarId);
    const addHC   = bid();
    const modH    = bid();
    const setHNew = bid();
    addBlock(mul31, 'operator_multiply', null, addHC,
      { NUM1: [3, hR1, [12, '_ht_h', hVarId]], NUM2: [1, [4, '31']] }, {});
    addBlock(addHC, 'operator_add', null, modH,
      { NUM1: [3, mul31, [4, '']], NUM2: [3, codeR, [12, '_ht_code', codeVarId]] }, {});
    addBlock(modH, 'operator_mod', null, setHNew,
      { NUM1: [3, addHC, [4, '']], NUM2: [1, [4, String(TABLE_SIZE)]] }, {});
    addBlock(setHNew, 'data_setvariableto', null, null,
      { VALUE: [3, modH, [4, '']] }, { VARIABLE: ['_ht_h', hVarId] });
    blocks[hR1].parent   = mul31;
    blocks[mul31].parent = addHC;
    blocks[codeR].parent = addHC;
    blocks[addHC].parent = modH;
    blocks[modH].parent  = setHNew;

    const incI = bid();
    addBlock(incI, 'data_changevariableby', null, null,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_ht_i', iVarId] });

    blocks[setCode].next   = setHNew;
    blocks[setHNew].parent = setCode;
    blocks[setHNew].next   = incI;
    blocks[incI].parent    = setHNew;

    const loopId = bid();
    addBlock(loopId, 'control_repeat_until', null, setI1, {
      CONDITION: [2, condGt],
      SUBSTACK:  [2, setCode],
    }, {});
    blocks[condGt].parent  = loopId;
    blocks[setCode].parent = loopId;
    blocks[setI1].next     = loopId;
    blocks[loopId].parent  = setI1;

    const hR2     = mkVar('_ht_h', hVarId);
    const addOne  = bid();
    const setSlot = bid();
    addBlock(addOne, 'operator_add', null, setSlot,
      { NUM1: [3, hR2, [12, '_ht_h', hVarId]], NUM2: [1, [4, '1']] }, {});
    addBlock(setSlot, 'data_setvariableto', null, loopId,
      { VALUE: [3, addOne, [4, '']] }, { VARIABLE: ['_ht_slot', slotVarId] });
    blocks[hR2].parent     = addOne;
    blocks[addOne].parent  = setSlot;
    blocks[loopId].next    = setSlot;
    blocks[setSlot].parent = loopId;

    return { first: setH0, last: setSlot };
  }

  // ── Procedure 1: add item: %s ─────────────────────────────────────────
  // Skip if already exists; insert at first empty or tombstone slot
  {
    const defId      = bid();
    const protoId    = bid();
    const argShadow  = bid();
    const argProcId  = `${spriteId}_add_item`;

    const { first: hashFirst, last: hashLast } = buildHashAndSlot(argProcId, defId);

    const setTs0 = bid();
    addBlock(setTs0, 'data_setvariableto', null, hashLast,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_ht_ts', tsVarId] });
    blocks[hashLast].next  = setTs0;
    blocks[setTs0].parent  = hashLast;

    // Branch A: state="1" AND items[slot]=item → already exists, stop (no duplicate)
    const stA  = buildStateEq('1');
    const iEqA = buildItemEq(argProcId);
    const andA = bid();
    addBlock(andA, 'operator_and', null, null,
      { OPERAND1: [2, stA], OPERAND2: [2, iEqA] }, {});
    blocks[stA].parent  = andA;
    blocks[iEqA].parent = andA;
    const stopA = buildStop();
    const ifA   = bid();
    addBlock(ifA, 'control_if', null, null,
      { CONDITION: [2, andA], SUBSTACK: [2, stopA] }, {});
    blocks[andA].parent  = ifA;
    blocks[stopA].parent = ifA;

    // Branch B: state="0" → insert (at tombstone if available), stop
    const stB = buildStateEq('0');
    const tsR1   = mkVar('_ht_ts', tsVarId);
    const tsGt0  = bid();
    addBlock(tsGt0, 'operator_gt', null, null,
      { OPERAND1: [3, tsR1, [12, '_ht_ts', tsVarId]], OPERAND2: [1, [4, '0']] }, {});
    blocks[tsR1].parent = tsGt0;
    const tsR2      = mkVar('_ht_ts', tsVarId);
    const setSlotTs = bid();
    addBlock(setSlotTs, 'data_setvariableto', null, null,
      { VALUE: [3, tsR2, [12, '_ht_ts', tsVarId]] }, { VARIABLE: ['_ht_slot', slotVarId] });
    blocks[tsR2].parent = setSlotTs;
    const ifTs = bid();
    addBlock(ifTs, 'control_if', null, null,
      { CONDITION: [2, tsGt0], SUBSTACK: [2, setSlotTs] }, {});
    blocks[tsGt0].parent     = ifTs;
    blocks[setSlotTs].parent = ifTs;
    const repItemB = buildRepItemArg(argProcId);
    const repStB   = buildRepState('1');
    const stopB    = buildStop();
    blocks[ifTs].next      = repItemB;
    blocks[repItemB].parent = ifTs;
    blocks[repItemB].next  = repStB;
    blocks[repStB].parent  = repItemB;
    blocks[repStB].next    = stopB;
    blocks[stopB].parent   = repStB;
    const ifB = bid();
    addBlock(ifB, 'control_if', null, null,
      { CONDITION: [2, stB], SUBSTACK: [2, ifTs] }, {});
    blocks[stB].parent  = ifB;
    blocks[ifTs].parent = ifB;

    // Branch C: state="2" AND ts=0 → save tombstone
    const stC   = buildStateEq('2');
    const tsR3  = mkVar('_ht_ts', tsVarId);
    const tsEq0 = bid();
    addBlock(tsEq0, 'operator_equals', null, null,
      { OPERAND1: [3, tsR3, [12, '_ht_ts', tsVarId]], OPERAND2: [1, [4, '0']] }, {});
    blocks[tsR3].parent = tsEq0;
    const andC = bid();
    addBlock(andC, 'operator_and', null, null,
      { OPERAND1: [2, stC], OPERAND2: [2, tsEq0] }, {});
    blocks[stC].parent   = andC;
    blocks[tsEq0].parent = andC;
    const slotR4  = mkVar('_ht_slot', slotVarId);
    const setTsSl = bid();
    addBlock(setTsSl, 'data_setvariableto', null, null,
      { VALUE: [3, slotR4, [12, '_ht_slot', slotVarId]] }, { VARIABLE: ['_ht_ts', tsVarId] });
    blocks[slotR4].parent = setTsSl;
    const ifC = bid();
    addBlock(ifC, 'control_if', null, null,
      { CONDITION: [2, andC], SUBSTACK: [2, setTsSl] }, {});
    blocks[andC].parent    = ifC;
    blocks[setTsSl].parent = ifC;

    const advSlot = buildAdvanceSlot();
    blocks[ifA].next       = ifB;
    blocks[ifB].parent     = ifA;
    blocks[ifB].next       = ifC;
    blocks[ifC].parent     = ifB;
    blocks[ifC].next       = advSlot;
    blocks[advSlot].parent = ifC;

    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, setTs0, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, ifA],
    }, {});
    blocks[setTs0].next    = repeatId;
    blocks[repeatId].parent = setTs0;
    blocks[ifA].parent     = repeatId;

    // After loop: if ts > 0, insert at tombstone
    const tsR5   = mkVar('_ht_ts', tsVarId);
    const tsGt0F = bid();
    addBlock(tsGt0F, 'operator_gt', null, null,
      { OPERAND1: [3, tsR5, [12, '_ht_ts', tsVarId]], OPERAND2: [1, [4, '0']] }, {});
    blocks[tsR5].parent = tsGt0F;
    const tsR6     = mkVar('_ht_ts', tsVarId);
    const setSlotF = bid();
    addBlock(setSlotF, 'data_setvariableto', null, null,
      { VALUE: [3, tsR6, [12, '_ht_ts', tsVarId]] }, { VARIABLE: ['_ht_slot', slotVarId] });
    blocks[tsR6].parent = setSlotF;
    const repItemF = buildRepItemArg(argProcId);
    const repStF   = buildRepState('1');
    blocks[setSlotF].next   = repItemF;
    blocks[repItemF].parent = setSlotF;
    blocks[repItemF].next   = repStF;
    blocks[repStF].parent   = repItemF;
    const ifFinal = bid();
    addBlock(ifFinal, 'control_if', null, repeatId,
      { CONDITION: [2, tsGt0F], SUBSTACK: [2, setSlotF] }, {});
    blocks[tsGt0F].parent   = ifFinal;
    blocks[setSlotF].parent = ifFinal;
    blocks[repeatId].next   = ifFinal;
    blocks[ifFinal].parent  = repeatId;

    addBlock(defId, 'procedures_definition', hashFirst, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argProcId]: [2, argShadow],
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
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['item', null] }, true);
    blocks[hashFirst].parent = defId;
  }

  // ── Procedure 2: contains item: %s ───────────────────────────────────
  {
    const defId     = bid();
    const protoId   = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_cont_item`;

    const { first: hashFirst, last: hashLast } = buildHashAndSlot(argProcId, defId);

    const setRes0 = bid();
    addBlock(setRes0, 'data_setvariableto', null, hashLast,
      { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] });
    blocks[hashLast].next   = setRes0;
    blocks[setRes0].parent  = hashLast;

    const stA  = buildStateEq('0');
    const stopA = buildStop();
    const ifA   = bid();
    addBlock(ifA, 'control_if', null, null,
      { CONDITION: [2, stA], SUBSTACK: [2, stopA] }, {});
    blocks[stA].parent   = ifA;
    blocks[stopA].parent = ifA;

    const stB  = buildStateEq('1');
    const iEqB = buildItemEq(argProcId);
    const andB = bid();
    addBlock(andB, 'operator_and', null, null,
      { OPERAND1: [2, stB], OPERAND2: [2, iEqB] }, {});
    blocks[stB].parent  = andB;
    blocks[iEqB].parent = andB;
    const setRes1 = bid();
    const stopB   = buildStop();
    addBlock(setRes1, 'data_setvariableto', null, null,
      { VALUE: [1, [10, '1']] }, { VARIABLE: ['result', resultVarId] });
    blocks[setRes1].next  = stopB;
    blocks[stopB].parent  = setRes1;
    const ifB = bid();
    addBlock(ifB, 'control_if', null, null,
      { CONDITION: [2, andB], SUBSTACK: [2, setRes1] }, {});
    blocks[andB].parent    = ifB;
    blocks[setRes1].parent = ifB;

    const advSlot = buildAdvanceSlot();
    blocks[ifA].next       = ifB;
    blocks[ifB].parent     = ifA;
    blocks[ifB].next       = advSlot;
    blocks[advSlot].parent = ifB;

    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, setRes0, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, ifA],
    }, {});
    blocks[setRes0].next    = repeatId;
    blocks[repeatId].parent = setRes0;
    blocks[ifA].parent      = repeatId;

    addBlock(defId, 'procedures_definition', hashFirst, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 700 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argProcId]: [2, argShadow],
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
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['item', null] }, true);
    blocks[hashFirst].parent = defId;
  }

  // ── Procedure 3: remove item: %s ─────────────────────────────────────
  {
    const defId     = bid();
    const protoId   = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_rem_item`;

    const { first: hashFirst, last: hashLast } = buildHashAndSlot(argProcId, defId);

    const stA  = buildStateEq('0');
    const stopA = buildStop();
    const ifA   = bid();
    addBlock(ifA, 'control_if', null, null,
      { CONDITION: [2, stA], SUBSTACK: [2, stopA] }, {});
    blocks[stA].parent   = ifA;
    blocks[stopA].parent = ifA;

    const stB  = buildStateEq('1');
    const iEqB = buildItemEq(argProcId);
    const andB = bid();
    addBlock(andB, 'operator_and', null, null,
      { OPERAND1: [2, stB], OPERAND2: [2, iEqB] }, {});
    blocks[stB].parent  = andB;
    blocks[iEqB].parent = andB;
    const repStB = buildRepState('2');
    const stopB  = buildStop();
    blocks[repStB].next  = stopB;
    blocks[stopB].parent = repStB;
    const ifB = bid();
    addBlock(ifB, 'control_if', null, null,
      { CONDITION: [2, andB], SUBSTACK: [2, repStB] }, {});
    blocks[andB].parent   = ifB;
    blocks[repStB].parent = ifB;

    const advSlot = buildAdvanceSlot();
    blocks[ifA].next       = ifB;
    blocks[ifB].parent     = ifA;
    blocks[ifB].next       = advSlot;
    blocks[advSlot].parent = ifB;

    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, hashLast, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, ifA],
    }, {});
    blocks[hashLast].next   = repeatId;
    blocks[repeatId].parent = hashLast;
    blocks[ifA].parent      = repeatId;

    addBlock(defId, 'procedures_definition', hashFirst, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 1400 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argProcId]: [2, argShadow],
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
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['item', null] }, true);
    blocks[hashFirst].parent = defId;
  }

  // ── Procedure 4: size ────────────────────────────────────────────────
  // Count slots with state="1"  (O(TABLE_SIZE) = O(1) constant)
  {
    const defId   = bid();
    const protoId = bid();

    // set result = 0; set _ht_slot = 1; repeat TABLE_SIZE: if state[slot]="1": change result by 1; slot++
    const setRes0 = bid();
    const setSlot1 = bid();
    addBlock(setRes0, 'data_setvariableto', setSlot1, defId,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['result', resultVarId] });
    addBlock(setSlot1, 'data_setvariableto', null, setRes0,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_ht_slot', slotVarId] });
    blocks[setRes0].next   = setSlot1;

    const stCnt = buildStateEq('1');
    const incRes = bid();
    addBlock(incRes, 'data_changevariableby', null, null,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['result', resultVarId] });
    const ifCnt = bid();
    addBlock(ifCnt, 'control_if', null, null,
      { CONDITION: [2, stCnt], SUBSTACK: [2, incRes] }, {});
    blocks[stCnt].parent  = ifCnt;
    blocks[incRes].parent = ifCnt;

    const advSlot = buildAdvanceSlot();
    blocks[ifCnt].next     = advSlot;
    blocks[advSlot].parent = ifCnt;

    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, setSlot1, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, ifCnt],
    }, {});
    blocks[setSlot1].next   = repeatId;
    blocks[repeatId].parent = setSlot1;
    blocks[ifCnt].parent    = repeatId;

    addBlock(defId, 'procedures_definition', setRes0, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 2100 });
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
    blocks[setRes0].parent = defId;
  }

  // ── Procedure 5: clear ───────────────────────────────────────────────
  {
    const defId   = bid();
    const protoId = bid();

    const delItems = bid();
    const delState = bid();
    addBlock(delItems, 'data_deletealloflist', delState, defId,
      {}, { LIST: ['items',     itemsListId] });
    addBlock(delState, 'data_deletealloflist', null,     delItems,
      {}, { LIST: ['_hs_state', stateListId] });

    const addItem = bid();
    const addSt   = bid();
    addBlock(addItem, 'data_addtolist', addSt, null,
      { ITEM: [1, [10, '']]  }, { LIST: ['items',     itemsListId] });
    addBlock(addSt,   'data_addtolist', null,  addItem,
      { ITEM: [1, [10, '0']] }, { LIST: ['_hs_state', stateListId] });

    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, delState, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, addItem],
    }, {});
    blocks[delState].next   = repeatId;
    blocks[repeatId].parent = delState;
    blocks[addItem].parent  = repeatId;

    addBlock(defId, 'procedures_definition', delItems, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 2700 });
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
    blocks[delItems].parent = defId;
  }

  return { lists, variables, blocks };
}
