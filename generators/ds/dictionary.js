/**
 * Dictionary – O(1) open-addressing hash table (linear probing)
 *
 * Hash function: polynomial rolling hash h = (h*31 + charCode) mod TABLE_SIZE
 *   charCode is looked up in pre-populated _ht_chars list (ASCII 32-126).
 *   item X of [list] is O(1) in Scratch; only the hash loop is O(key_length).
 *   No O(n) scan over all keys – probe depth is O(1) amortized at <50% load.
 *
 * Slot states stored in _ht_state list:
 *   "0" = empty   "1" = occupied   "2" = tombstone (deleted)
 */
export function buildDictionary(spriteId, tableSize = 65536) {
  const TABLE_SIZE = tableSize;
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  // ── List / Variable IDs ──────────────────────────────────────────────
  const keysListId  = `${spriteId}_keys`;
  const valsListId  = `${spriteId}_vals`;
  const stateListId = `${spriteId}_state`;
  const charsListId = `${spriteId}_chars`;

  const resultVarId = `${spriteId}_result`;
  const hVarId      = `${spriteId}_ht_h`;
  const iVarId      = `${spriteId}_ht_i`;
  const slotVarId   = `${spriteId}_ht_slot`;
  const codeVarId   = `${spriteId}_ht_code`;
  const tsVarId     = `${spriteId}_ht_ts`;
  const sizeVarId   = `${spriteId}_ht_size`;

  // Pre-populate: keys/values = 64 empty strings, state = 64 "0"s,
  // _ht_chars = ASCII 32-126 (95 printable chars) – no init procedure needed!
  const ASCII_CHARS = [];
  for (let i = 32; i <= 126; i++) ASCII_CHARS.push(String.fromCharCode(i));

  const lists = {
    [keysListId]:  ['keys',      Array(TABLE_SIZE).fill('')],
    [valsListId]:  ['values',    Array(TABLE_SIZE).fill('')],
    [stateListId]: ['_ht_state', Array(TABLE_SIZE).fill('0')],
    [charsListId]: ['_ht_chars', ASCII_CHARS],
  };

  const variables = {
    [resultVarId]: ['result',    0],
    [hVarId]:      ['_ht_h',    0],
    [iVarId]:      ['_ht_i',    0],
    [slotVarId]:   ['_ht_slot', 0],
    [codeVarId]:   ['_ht_code', 0],
    [tsVarId]:     ['_ht_ts',   0],
    [sizeVarId]:   ['_ht_size', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields,
                    shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // ── Low-level block factories ────────────────────────────────────────

  /** [stop [this script]] */
  function buildStop() {
    const id = bid();
    addBlock(id, 'control_stop', null, null, {},
      { STOP_OPTION: ['this script', null] }, false, false,
      { mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });
    return id;
  }

  /** variable reporter – just creates the reporter block, caller sets parent */
  function mkVar(name, varId) {
    const id = bid();
    addBlock(id, 'data_variable', null, null, {}, { VARIABLE: [name, varId] });
    return id;
  }

  /** (item _ht_slot of [stateList]) = val  →  returns eqOp block id */
  function buildStateEq(val) {
    const slotR  = mkVar('_ht_slot', slotVarId);
    const itemOp = bid();
    const eqOp   = bid();
    addBlock(itemOp, 'data_itemoflist', null, eqOp,
      { INDEX: [3, slotR, [7, '']] }, { LIST: ['_ht_state', stateListId] });
    addBlock(eqOp, 'operator_equals', null, null,
      { OPERAND1: [3, itemOp, [10, '']], OPERAND2: [1, [10, val]] }, {});
    blocks[slotR].parent  = itemOp;
    blocks[itemOp].parent = eqOp;
    return eqOp;
  }

  /** (item _ht_slot of [keys]) = argProcId  →  returns eqOp block id */
  function buildKeyEq(argProcId) {
    const slotR  = mkVar('_ht_slot', slotVarId);
    const itemOp = bid();
    const argR   = bid();
    const eqOp   = bid();
    addBlock(itemOp, 'data_itemoflist', null, eqOp,
      { INDEX: [3, slotR, [7, '']] }, { LIST: ['keys', keysListId] });
    addBlock(argR, 'argument_reporter_string_number', null, eqOp, {},
      { VALUE: [argProcId, null] });
    addBlock(eqOp, 'operator_equals', null, null,
      { OPERAND1: [3, itemOp, [10, '']], OPERAND2: [3, argR, [10, '']] }, {});
    blocks[slotR].parent  = itemOp;
    blocks[itemOp].parent = eqOp;
    blocks[argR].parent   = eqOp;
    return eqOp;
  }

  /** replace item _ht_slot of [_ht_state] with literal val  →  returns repOp */
  function buildRepState(val) {
    const slotR = mkVar('_ht_slot', slotVarId);
    const repOp = bid();
    addBlock(repOp, 'data_replaceitemoflist', null, null,
      { INDEX: [3, slotR, [7, '']], ITEM: [1, [10, val]] },
      { LIST: ['_ht_state', stateListId] });
    blocks[slotR].parent = repOp;
    return repOp;
  }

  /** replace item _ht_slot of [listName] with argument argProcId  →  returns repOp */
  function buildRepListArg(listId, listName, argProcId) {
    const slotR = mkVar('_ht_slot', slotVarId);
    const argR  = bid();
    const repOp = bid();
    addBlock(argR, 'argument_reporter_string_number', null, null, {},
      { VALUE: [argProcId, null] });
    addBlock(repOp, 'data_replaceitemoflist', null, null,
      { INDEX: [3, slotR, [7, '']], ITEM: [3, argR, [10, '']] },
      { LIST: [listName, listId] });
    blocks[slotR].parent = repOp;
    blocks[argR].parent  = repOp;
    return repOp;
  }

  /** _ht_slot = (_ht_slot mod TABLE_SIZE) + 1  →  returns setSl block */
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

  // ── Hash computation helper ──────────────────────────────────────────
  /**
   * Emits:
   *   set _ht_h = 0
   *   set _ht_i = 1
   *   repeat until _ht_i > length(key):
   *     set _ht_code = item# of (letter _ht_i of key) in [_ht_chars]
   *     set _ht_h   = (_ht_h * 31 + _ht_code) mod TABLE_SIZE
   *     change _ht_i by 1
   *   set _ht_slot = _ht_h + 1
   *
   * Returns { first: setH0, last: setSlot }
   */
  function buildHashAndSlot(argProcId, defParentId) {
    const setH0  = bid();
    const setI1  = bid();
    addBlock(setH0, 'data_setvariableto', setI1, defParentId,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_ht_h', hVarId] });
    addBlock(setI1, 'data_setvariableto', null, setH0,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_ht_i', iVarId] });
    blocks[setH0].next = setI1;

    // condition: _ht_i > length(key)
    const condI   = mkVar('_ht_i', iVarId);
    const condArgR = bid();
    const condLen = bid();
    const condGt  = bid();
    addBlock(condArgR, 'argument_reporter_string_number', null, condLen, {},
      { VALUE: [argProcId, null] });
    addBlock(condLen, 'operator_length', null, condGt,
      { STRING: [3, condArgR, [10, '']] }, {});
    addBlock(condGt, 'operator_gt', null, null,
      { OPERAND1: [3, condI, [12, '_ht_i', iVarId]], OPERAND2: [3, condLen, [4, '']] }, {});
    blocks[condArgR].parent = condLen;
    blocks[condLen].parent  = condGt;
    blocks[condI].parent    = condGt;

    // body: _ht_code = item# of (letter _ht_i of key) in [_ht_chars]
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

    // _ht_h = (_ht_h * 31 + _ht_code) mod TABLE_SIZE
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

    // change _ht_i by 1
    const incI = bid();
    addBlock(incI, 'data_changevariableby', null, null,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_ht_i', iVarId] });

    // chain body: setCode → setHNew → incI
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

    // set _ht_slot = _ht_h + 1
    const hR2     = mkVar('_ht_h', hVarId);
    const addOne  = bid();
    const setSlot = bid();
    addBlock(addOne, 'operator_add', null, setSlot,
      { NUM1: [3, hR2, [12, '_ht_h', hVarId]], NUM2: [1, [4, '1']] }, {});
    addBlock(setSlot, 'data_setvariableto', null, loopId,
      { VALUE: [3, addOne, [4, '']] }, { VARIABLE: ['_ht_slot', slotVarId] });
    blocks[hR2].parent    = addOne;
    blocks[addOne].parent = setSlot;
    blocks[loopId].next   = setSlot;
    blocks[setSlot].parent = loopId;

    return { first: setH0, last: setSlot };
  }

      // ── Procedure 1: set key: %s value: %s ──────────────────────────────────
  // Hash key → slot, probe table:
  //   state="1" & key match → update value, stop
  //   state="0"             → insert (reuse first tombstone if any), stop
  //   state="2" & ts=0      → remember as tombstone insertion point
  //   else                  → advance slot
  // After loop: if ts>0, insert at tombstone (handles all-tombstone table)
  {
    const defId      = bid();
    const protoId    = bid();
    const argKeySh   = bid();
    const argValSh   = bid();
    const argKeyProc = `${spriteId}_set_key`;
    const argValProc = `${spriteId}_set_val`;

    const { first: hashFirst, last: hashLast } = buildHashAndSlot('key', defId);

    // set _ht_ts = 0
    const setTs0 = bid();
    addBlock(setTs0, 'data_setvariableto', null, hashLast,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_ht_ts', tsVarId] });
    blocks[hashLast].next  = setTs0;
    blocks[setTs0].parent  = hashLast;

    // ─ Branch A: state="1" AND keys[slot]=key  →  update value, stop ─
    const stA  = buildStateEq('1');
    const kEqA = buildKeyEq('key');
    const andA = bid();
    addBlock(andA, 'operator_and', null, null,
      { OPERAND1: [2, stA], OPERAND2: [2, kEqA] }, {});
    blocks[stA].parent  = andA;
    blocks[kEqA].parent = andA;
    const repValA = buildRepListArg(valsListId, 'values', 'value');
    const stopA   = buildStop();
    blocks[repValA].next = stopA;
    blocks[stopA].parent = repValA;
    const ifA = bid();
    addBlock(ifA, 'control_if', null, null,
      { CONDITION: [2, andA], SUBSTACK: [2, repValA] }, {});
    blocks[andA].parent    = ifA;
    blocks[repValA].parent = ifA;

    // ─ Branch B: state="0"  →  insert (at ts if saved), stop ─
    const stB = buildStateEq('0');
    // inner: if _ht_ts > 0 then _ht_slot = _ht_ts
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
    const repKeyB = buildRepListArg(keysListId, 'keys', 'key');
    const repValB = buildRepListArg(valsListId, 'values', 'value');
    const repStB  = buildRepState('1');
    const incSizeB = bid();
    const stopB   = bid();
    addBlock(incSizeB, 'data_changevariableby', stopB, repStB, { VALUE: [1, [4, '1']] }, { VARIABLE: ['_ht_size', sizeVarId] });
    addBlock(stopB, 'control_stop', null, incSizeB, {}, { STOP_OPTION: ['this script', null] }, false, false, { mutation: { tagName: 'mutation', children: [], hasnext: 'false' } });

    blocks[ifTs].next      = repKeyB;
    blocks[repKeyB].parent = ifTs;
    blocks[repKeyB].next   = repValB;
    blocks[repValB].parent = repKeyB;
    blocks[repValB].next   = repStB;
    blocks[repStB].parent  = repValB;
    blocks[repStB].next    = incSizeB;
    blocks[incSizeB].parent = repStB;
    blocks[incSizeB].next = stopB;
    blocks[stopB].parent = incSizeB;

    const ifB = bid();
    addBlock(ifB, 'control_if', null, null,
      { CONDITION: [2, stB], SUBSTACK: [2, ifTs] }, {});
    blocks[stB].parent  = ifB;
    blocks[ifTs].parent = ifB;

    // ─ Branch C: state="2" AND ts=0  →  save tombstone slot ─
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

    // advance slot
    const advSlot = buildAdvanceSlot();

    // chain loop body: ifA → ifB → ifC → advSlot
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

    // After loop: if ts > 0, insert at tombstone slot
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
    const repKeyF = buildRepListArg(keysListId, 'keys', 'key');
    const repValF = buildRepListArg(valsListId, 'values', 'value');
    const repStF  = buildRepState('1');
    const incSizeF = bid();
    addBlock(incSizeF, 'data_changevariableby', null, repStF, { VALUE: [1, [4, '1']] }, { VARIABLE: ['_ht_size', sizeVarId] });

    blocks[setSlotF].next  = repKeyF;
    blocks[repKeyF].parent = setSlotF;
    blocks[repKeyF].next   = repValF;
    blocks[repValF].parent = repKeyF;
    blocks[repValF].next   = repStF;
    blocks[repStF].parent  = repValF;
    blocks[repStF].next = incSizeF;
    blocks[incSizeF].parent = repStF;

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
      [argKeyProc]: [2, argKeySh],
      [argValProc]: [2, argValSh],
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
    addBlock(argKeySh, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['key', null] }, true);
    addBlock(argValSh, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['value', null] }, true);
    blocks[hashFirst].parent = defId;
  }

  // ── Procedure 2: get key: %s ──────────────────────────────────────────
  // state="0" → result="", stop  |  state="1"&match → result=values[slot], stop  |  else advance
  {
    const defId      = bid();
    const protoId    = bid();
    const argKeySh   = bid();
    const argKeyProc = `${spriteId}_get_key`;

    const { first: hashFirst, last: hashLast } = buildHashAndSlot('key', defId);

    // Branch A: state="0" → result="", stop
    const stA         = buildStateEq('0');
    const setResEmpty = bid();
    addBlock(setResEmpty, 'data_setvariableto', null, null,
      { VALUE: [1, [10, '']] }, { VARIABLE: ['result', resultVarId] });
    const stopA = buildStop();
    blocks[setResEmpty].next = stopA;
    blocks[stopA].parent     = setResEmpty;
    const ifA = bid();
    addBlock(ifA, 'control_if', null, null,
      { CONDITION: [2, stA], SUBSTACK: [2, setResEmpty] }, {});
    blocks[stA].parent         = ifA;
    blocks[setResEmpty].parent = ifA;

    // Branch B: state="1" AND key matches → result=values[slot], stop
    const stB  = buildStateEq('1');
    const kEqB = buildKeyEq('key');
    const andB = bid();
    addBlock(andB, 'operator_and', null, null,
      { OPERAND1: [2, stB], OPERAND2: [2, kEqB] }, {});
    blocks[stB].parent  = andB;
    blocks[kEqB].parent = andB;
    const slotRV  = mkVar('_ht_slot', slotVarId);
    const itemVal = bid();
    const setResV = bid();
    const stopB   = buildStop();
    addBlock(itemVal, 'data_itemoflist', null, setResV,
      { INDEX: [3, slotRV, [7, '']] }, { LIST: ['values', valsListId] });
    addBlock(setResV, 'data_setvariableto', null, null,
      { VALUE: [3, itemVal, [10, '']] }, { VARIABLE: ['result', resultVarId] });
    blocks[slotRV].parent  = itemVal;
    blocks[itemVal].parent = setResV;
    blocks[setResV].next   = stopB;
    blocks[stopB].parent   = setResV;
    const ifB = bid();
    addBlock(ifB, 'control_if', null, null,
      { CONDITION: [2, andB], SUBSTACK: [2, setResV] }, {});
    blocks[andB].parent    = ifB;
    blocks[setResV].parent = ifB;

    const advSlot = buildAdvanceSlot();
    blocks[ifA].next       = ifB;
    blocks[ifB].parent     = ifA;
    blocks[ifB].next       = advSlot;
    blocks[advSlot].parent = ifB;

    // Initialize result = "" so that if the key is not found the return value is always ""
    const setResInit = bid();
    addBlock(setResInit, 'data_setvariableto', null, hashLast,
      { VALUE: [1, [10, '']] }, { VARIABLE: ['result', resultVarId] });
    blocks[hashLast].next    = setResInit;
    blocks[setResInit].parent = hashLast;

    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, setResInit, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, ifA],
    }, {});
    blocks[setResInit].next  = repeatId;
    blocks[repeatId].parent  = setResInit;
    blocks[ifA].parent       = repeatId;

    addBlock(defId, 'procedures_definition', hashFirst, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 700 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProc]: [2, argKeySh],
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
    addBlock(argKeySh, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['key', null] }, true);
    blocks[hashFirst].parent = defId;
  }

  // ── Procedure 3: contains key: %s ────────────────────────────────────
  // result=0 initially; state="0"→stop(0); state="1"&match→result=1,stop; else advance
  {
    const defId      = bid();
    const protoId    = bid();
    const argKeySh   = bid();
    const argKeyProc = `${spriteId}_contains_key`;

    const { first: hashFirst, last: hashLast } = buildHashAndSlot('key', defId);

    const setRes0 = bid();
    addBlock(setRes0, 'data_setvariableto', null, hashLast,
      { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] });
    blocks[hashLast].next   = setRes0;
    blocks[setRes0].parent  = hashLast;

    // Branch A: state="0" → stop (result stays 0)
    const stA  = buildStateEq('0');
    const stopA = buildStop();
    const ifA   = bid();
    addBlock(ifA, 'control_if', null, null,
      { CONDITION: [2, stA], SUBSTACK: [2, stopA] }, {});
    blocks[stA].parent   = ifA;
    blocks[stopA].parent = ifA;

    // Branch B: state="1" AND match → result=1, stop
    const stB  = buildStateEq('1');
    const kEqB = buildKeyEq('key');
    const andB = bid();
    addBlock(andB, 'operator_and', null, null,
      { OPERAND1: [2, stB], OPERAND2: [2, kEqB] }, {});
    blocks[stB].parent  = andB;
    blocks[kEqB].parent = andB;
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
    addBlock(repeatId, "control_repeat", null, setRes0, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, ifA],
    }, {});
    blocks[setRes0].next    = repeatId;
    blocks[repeatId].parent = setRes0;
    blocks[ifA].parent      = repeatId;

    addBlock(defId, 'procedures_definition', hashFirst, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 1400 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProc]: [2, argKeySh],
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
    addBlock(argKeySh, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['key', null] }, true);
    blocks[hashFirst].parent = defId;
  }

      // ── Procedure 4: delete key: %s ──────────────────────────────────────
  // state="0" → stop (not found)  |  state="1"&match → mark tombstone "2", stop  |  else advance
  {
    const defId      = bid();
    const protoId    = bid();
    const argKeySh   = bid();
    const argKeyProc = `${spriteId}_del_key`;

    const { first: hashFirst, last: hashLast } = buildHashAndSlot('key', defId);

    // Branch A: state="0" → stop
    const stA  = buildStateEq('0');
    const stopA = buildStop();
    const ifA   = bid();
    addBlock(ifA, 'control_if', null, null,
      { CONDITION: [2, stA], SUBSTACK: [2, stopA] }, {});
    blocks[stA].parent   = ifA;
    blocks[stopA].parent = ifA;

    // Branch B: state="1" AND match → mark as tombstone "2", stop
    const stB  = buildStateEq('1');
    const kEqB = buildKeyEq('key');
    const andB = bid();
    addBlock(andB, 'operator_and', null, null,
      { OPERAND1: [2, stB], OPERAND2: [2, kEqB] }, {});
    blocks[stB].parent  = andB;
    blocks[kEqB].parent = andB;
    const repStB = buildRepState('2');
    const decSize = bid();
    addBlock(decSize, 'data_changevariableby', null, repStB, { VALUE: [1, [4, '-1']] }, { VARIABLE: ['_ht_size', sizeVarId] });
    const stopB  = buildStop();
    blocks[repStB].next  = decSize;
    blocks[decSize].parent = repStB;
    blocks[decSize].next = stopB;
    blocks[stopB].parent = decSize;

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
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 2100 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argKeyProc]: [2, argKeySh],
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
    addBlock(argKeySh, 'argument_reporter_string_number', null, protoId, {},
      { VALUE: ['key', null] }, true);
    blocks[hashFirst].parent = defId;
  }

      // ── Procedure 5: clear ───────────────────────────────────────────────
  // Delete all, then re-add TABLE_SIZE empty slots
  {
    const defId   = bid();
    const protoId = bid();

    const delKeys  = bid();
    const delVals  = bid();
    const delState = bid();
    addBlock(delKeys,  'data_deletealloflist', delVals,  defId,
      {}, { LIST: ['keys',      keysListId]  });
    addBlock(delVals,  'data_deletealloflist', delState, delKeys,
      {}, { LIST: ['values',    valsListId]  });
    addBlock(delState, 'data_deletealloflist', null,     delVals,
      {}, { LIST: ['_ht_state', stateListId] });

    const addKey = bid();
    const addVal = bid();
    const addSt  = bid();
    addBlock(addKey, 'data_addtolist', addVal, null,
      { ITEM: [1, [10, '']]  }, { LIST: ['keys',      keysListId]  });
    addBlock(addVal, 'data_addtolist', addSt,  addKey,
      { ITEM: [1, [10, '']]  }, { LIST: ['values',    valsListId]  });
    addBlock(addSt,  'data_addtolist', null,   addVal,
      { ITEM: [1, [10, '0']] }, { LIST: ['_ht_state', stateListId] });

    const setSize0 = bid();
    addBlock(setSize0, 'data_setvariableto', null, delState, { VALUE: [1, [4, '0']] }, { VARIABLE: ['_ht_size', sizeVarId] });
    blocks[delState].next = setSize0;
    blocks[setSize0].parent = delState;

    const repeatId = bid();
    addBlock(repeatId, 'control_repeat', null, setSize0, {
      TIMES: [1, [6, String(TABLE_SIZE)]], SUBSTACK: [2, addKey],
    }, {});
    blocks[setSize0].next   = repeatId;
    blocks[repeatId].parent = setSize0;
    blocks[addKey].parent   = repeatId;

    addBlock(defId, 'procedures_definition', delKeys, null,
      { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 2800 });
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
    blocks[delKeys].parent = defId;
  }








  // ── Procedure 6: size ───────────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const sizeR = mkVar('_ht_size', sizeVarId);
    const setResId = bid();

    addBlock(defId, 'procedures_definition', setResId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 3500 });
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

    addBlock(setResId, 'data_setvariableto', null, defId,
      { VALUE: [3, sizeR, [12, '_ht_size', sizeVarId]] }, { VARIABLE: ['result', resultVarId] });
    blocks[sizeR].parent = setResId;
  }

  return { lists, variables, blocks };
}
