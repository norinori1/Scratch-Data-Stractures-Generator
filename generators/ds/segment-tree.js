export function buildSegmentTree(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const treeListId = `${spriteId}_seg_tree`;
  const resultVarId = `${spriteId}_result`;
  const nVarId = `${spriteId}_st_n`;
  const iVarId = `${spriteId}_st_i`;
  const lVarId = `${spriteId}_st_l`;
  const rVarId = `${spriteId}_st_r`;

  const lists = {
    [treeListId]: ['seg_tree', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
    [nVarId]: ['_st_n', 0],
    [iVarId]: ['_st_i', 0],
    [lVarId]: ['_st_l', 0],
    [rVarId]: ['_st_r', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // ── Procedure 1: init size: %s ────────────────────────────────────────
  // set _st_n to size
  // delete all of seg_tree
  // repeat (2 * size): add 0 to seg_tree
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_init_sz`;

    const argR1 = bid();
    const setNId = bid();
    const delId = bid();
    const argR2 = bid();
    const mulId = bid();
    const repeatId = bid();
    const addZeroId = bid();

    addBlock(defId, 'procedures_definition', setNId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'init size: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['size']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['size', null] }, true, false);

    addBlock(argR1, 'argument_reporter_string_number', null, setNId, {}, { VALUE: ['size', null] }, false, false);
    addBlock(setNId, 'data_setvariableto', delId, defId,
      { VALUE: [3, argR1, [10, '']] }, { VARIABLE: ['_st_n', nVarId] }, false, false);
    addBlock(delId, 'data_deletealloflist', repeatId, setNId, {}, { LIST: ['seg_tree', treeListId] }, false, false);

    addBlock(argR2, 'argument_reporter_string_number', null, mulId, {}, { VALUE: ['size', null] }, false, false);
    addBlock(mulId, 'operator_multiply', null, repeatId,
      { NUM1: [3, argR2, [10, '']], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(repeatId, 'control_repeat', null, delId, {
      TIMES: [3, mulId, [6, '']],
      SUBSTACK: [2, addZeroId],
    }, {}, false, false);
    addBlock(addZeroId, 'data_addtolist', null, repeatId, { ITEM: [1, [10, '0']] }, { LIST: ['seg_tree', treeListId] }, false, false);

    blocks[argR1].parent = setNId;
    blocks[argR2].parent = mulId;
    blocks[mulId].parent = repeatId;
    blocks[addZeroId].parent = repeatId;
  }

  // ── Procedure 2: update index: %s value: %s ───────────────────────────
  // set _st_i to (index + _st_n - 1)
  // replace seg_tree[_st_i] with value
  // repeat until _st_i <= 1:
  //   set _st_i to floor(_st_i / 2)
  //   set result to seg_tree[_st_i*2] + seg_tree[_st_i*2+1]
  //   replace seg_tree[_st_i] with result
  {
    const defId = bid();
    const protoId = bid();
    const argIdxShadow = bid();
    const argValShadow = bid();
    const argIdxProcId = `${spriteId}_upd_idx`;
    const argValProcId = `${spriteId}_upd_val`;

    const argIdxR = bid();
    const nR1 = bid();
    const addIdx = bid();
    const sub1 = bid();
    const setIId = bid();

    const argValR = bid();
    const repLeafId = bid();
    const iR_loop = bid();
    const gt1Id = bid();
    const notGt = bid();
    const loopId = bid();

    const iR_div = bid();
    const divId = bid();
    const floorId = bid();
    const setIInner = bid();

    const iR_l = bid();
    const mulL = bid();
    const leftItem = bid();
    const iR_r = bid();
    const mulR = bid();
    const addR1 = bid();
    const rightItem = bid();
    const addLR = bid();
    const setResId = bid();
    const resR1 = bid();
    const iR_rep = bid();
    const repNodeId = bid();

    addBlock(defId, 'procedures_definition', setIId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 300 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argIdxProcId]: [2, argIdxShadow],
      [argValProcId]: [2, argValShadow],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'update index: %s value: %s',
        argumentids: JSON.stringify([argIdxProcId, argValProcId]),
        argumentnames: JSON.stringify(['index', 'value']),
        argumentdefaults: JSON.stringify(['', '']),
        warp: 'false',
      },
    });
    addBlock(argIdxShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['index', null] }, true, false);
    addBlock(argValShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['value', null] }, true, false);

    // set _st_i to (index + _st_n - 1)
    addBlock(argIdxR, 'argument_reporter_string_number', null, addIdx, {}, { VALUE: ['index', null] }, false, false);
    addBlock(nR1, 'data_variable', null, addIdx, {}, { VARIABLE: ['_st_n', nVarId] }, false, false);
    addBlock(addIdx, 'operator_add', null, sub1,
      { NUM1: [3, argIdxR, [10, '']], NUM2: [3, nR1, [12, '_st_n', nVarId]] }, {}, false, false);
    addBlock(sub1, 'operator_subtract', null, setIId,
      { NUM1: [3, addIdx, [4, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(setIId, 'data_setvariableto', repLeafId, defId,
      { VALUE: [3, sub1, [4, '']] }, { VARIABLE: ['_st_i', iVarId] }, false, false);

    // replace seg_tree[_st_i] with value
    addBlock(argValR, 'argument_reporter_string_number', null, repLeafId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(iR_loop, 'data_variable', null, repLeafId, {}, { VARIABLE: ['_st_i', iVarId] }, false, false);
    addBlock(repLeafId, 'data_replaceitemoflist', loopId, setIId,
      { INDEX: [3, iR_loop, [7, '']], ITEM: [3, argValR, [10, '']] },
      { LIST: ['seg_tree', treeListId] }, false, false);

    // loop condition: NOT (_st_i > 1)  i.e. _st_i <= 1
    const iR_cond = bid();
    addBlock(iR_cond, 'data_variable', null, gt1Id, {}, { VARIABLE: ['_st_i', iVarId] }, false, false);
    addBlock(gt1Id, 'operator_gt', null, notGt,
      { OPERAND1: [3, iR_cond, [12, '_st_i', iVarId]], OPERAND2: [1, [4, '1']] }, {}, false, false);
    addBlock(notGt, 'operator_not', null, loopId, { OPERAND: [2, gt1Id] }, {}, false, false);

    // body:
    // set _st_i to floor(_st_i / 2)
    const iR_div2 = bid();
    addBlock(iR_div2, 'data_variable', null, divId, {}, { VARIABLE: ['_st_i', iVarId] }, false, false);
    addBlock(divId, 'operator_divide', null, floorId,
      { NUM1: [3, iR_div2, [12, '_st_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(floorId, 'operator_mathop', null, setIInner,
      { NUM: [3, divId, [4, '']] }, { OPERATOR: ['floor', null] }, false, false);
    addBlock(setIInner, 'data_setvariableto', setResId, loopId,
      { VALUE: [3, floorId, [4, '']] }, { VARIABLE: ['_st_i', iVarId] }, false, false);

    // result = seg_tree[_st_i*2] + seg_tree[_st_i*2+1]
    const iR_l2 = bid();
    addBlock(iR_l2, 'data_variable', null, mulL, {}, { VARIABLE: ['_st_i', iVarId] }, false, false);
    addBlock(mulL, 'operator_multiply', null, leftItem,
      { NUM1: [3, iR_l2, [12, '_st_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(leftItem, 'data_itemoflist', null, addLR,
      { INDEX: [3, mulL, [7, '']] }, { LIST: ['seg_tree', treeListId] }, false, false);

    const iR_r2 = bid();
    addBlock(iR_r2, 'data_variable', null, mulR, {}, { VARIABLE: ['_st_i', iVarId] }, false, false);
    addBlock(mulR, 'operator_multiply', null, addR1,
      { NUM1: [3, iR_r2, [12, '_st_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(addR1, 'operator_add', null, rightItem,
      { NUM1: [3, mulR, [4, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(rightItem, 'data_itemoflist', null, addLR,
      { INDEX: [3, addR1, [7, '']] }, { LIST: ['seg_tree', treeListId] }, false, false);

    addBlock(addLR, 'operator_add', null, setResId,
      { NUM1: [3, leftItem, [10, '']], NUM2: [3, rightItem, [10, '']] }, {}, false, false);

    addBlock(setResId, 'data_setvariableto', repNodeId, setIInner,
      { VALUE: [3, addLR, [4, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    // replace seg_tree[_st_i] with result
    const iR_rep2 = bid();
    addBlock(iR_rep2, 'data_variable', null, repNodeId, {}, { VARIABLE: ['_st_i', iVarId] }, false, false);
    const resR2 = bid();
    addBlock(resR2, 'data_variable', null, repNodeId, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(repNodeId, 'data_replaceitemoflist', null, setResId,
      { INDEX: [3, iR_rep2, [7, '']], ITEM: [3, resR2, [12, 'result', resultVarId]] },
      { LIST: ['seg_tree', treeListId] }, false, false);

    addBlock(loopId, 'control_repeat_until', null, repLeafId, {
      CONDITION: [2, notGt],
      SUBSTACK: [2, setIInner],
    }, {}, false, false);

    // fix parents
    blocks[argIdxR].parent = addIdx;
    blocks[nR1].parent = addIdx;
    blocks[addIdx].parent = sub1;
    blocks[sub1].parent = setIId;
    blocks[argValR].parent = repLeafId;
    blocks[iR_loop].parent = repLeafId;
    blocks[repLeafId].parent = setIId;
    blocks[iR_cond].parent = gt1Id;
    blocks[gt1Id].parent = notGt;
    blocks[notGt].parent = loopId;
    blocks[loopId].parent = repLeafId;
    blocks[iR_div2].parent = divId;
    blocks[divId].parent = floorId;
    blocks[floorId].parent = setIInner;
    blocks[setIInner].parent = loopId;
    blocks[iR_l2].parent = mulL;
    blocks[mulL].parent = leftItem;
    blocks[leftItem].parent = addLR;
    blocks[iR_r2].parent = mulR;
    blocks[mulR].parent = addR1;
    blocks[addR1].parent = rightItem;
    blocks[rightItem].parent = addLR;
    blocks[addLR].parent = setResId;
    blocks[setResId].parent = setIInner;
    blocks[iR_rep2].parent = repNodeId;
    blocks[resR2].parent = repNodeId;
    blocks[repNodeId].parent = setResId;
  }

  // ── Procedure 3: query left: %s right: %s ────────────────────────────
  // set result to 0
  // set _st_l to (left + _st_n - 1)
  // set _st_r to (right + _st_n)
  // repeat until _st_l >= _st_r:
  //   if _st_l is odd (mod 2 = 1): result += seg_tree[_st_l]; _st_l++
  //   if _st_r is odd (mod 2 = 1): _st_r--; result += seg_tree[_st_r]
  //   _st_l = floor(_st_l/2); _st_r = floor(_st_r/2)
  {
    const defId = bid();
    const protoId = bid();
    const argLShadow = bid();
    const argRShadow = bid();
    const argLProcId = `${spriteId}_qry_l`;
    const argRProcId = `${spriteId}_qry_r`;

    const setRes0Id = bid();
    const argLR1 = bid();
    const nR_l = bid();
    const addL = bid();
    const sub1L = bid();
    const setLId = bid();
    const argRR1 = bid();
    const nR_r = bid();
    const addR = bid();
    const setRId = bid();
    const loopId = bid();

    addBlock(defId, 'procedures_definition', setRes0Id, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 700 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argLProcId]: [2, argLShadow],
      [argRProcId]: [2, argRShadow],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'query left: %s right: %s',
        argumentids: JSON.stringify([argLProcId, argRProcId]),
        argumentnames: JSON.stringify(['left', 'right']),
        argumentdefaults: JSON.stringify(['', '']),
        warp: 'false',
      },
    });
    addBlock(argLShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['left', null] }, true, false);
    addBlock(argRShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['right', null] }, true, false);

    addBlock(setRes0Id, 'data_setvariableto', setLId, defId,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    addBlock(argLR1, 'argument_reporter_string_number', null, addL, {}, { VALUE: ['left', null] }, false, false);
    addBlock(nR_l, 'data_variable', null, addL, {}, { VARIABLE: ['_st_n', nVarId] }, false, false);
    addBlock(addL, 'operator_add', null, sub1L,
      { NUM1: [3, argLR1, [10, '']], NUM2: [3, nR_l, [12, '_st_n', nVarId]] }, {}, false, false);
    addBlock(sub1L, 'operator_subtract', null, setLId,
      { NUM1: [3, addL, [4, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(setLId, 'data_setvariableto', setRId, setRes0Id,
      { VALUE: [3, sub1L, [4, '']] }, { VARIABLE: ['_st_l', lVarId] }, false, false);

    addBlock(argRR1, 'argument_reporter_string_number', null, addR, {}, { VALUE: ['right', null] }, false, false);
    addBlock(nR_r, 'data_variable', null, addR, {}, { VARIABLE: ['_st_n', nVarId] }, false, false);
    addBlock(addR, 'operator_add', null, setRId,
      { NUM1: [3, argRR1, [10, '']], NUM2: [3, nR_r, [12, '_st_n', nVarId]] }, {}, false, false);
    addBlock(setRId, 'data_setvariableto', loopId, setLId,
      { VALUE: [3, addR, [4, '']] }, { VARIABLE: ['_st_r', rVarId] }, false, false);

    // loop condition: _st_l >= _st_r  → NOT (_st_l < _st_r)
    const lR_cond = bid();
    const rR_cond = bid();
    const ltCond = bid();
    const notLt = bid();
    addBlock(lR_cond, 'data_variable', null, ltCond, {}, { VARIABLE: ['_st_l', lVarId] }, false, false);
    addBlock(rR_cond, 'data_variable', null, ltCond, {}, { VARIABLE: ['_st_r', rVarId] }, false, false);
    addBlock(ltCond, 'operator_lt', null, notLt,
      { OPERAND1: [3, lR_cond, [12, '_st_l', lVarId]], OPERAND2: [3, rR_cond, [12, '_st_r', rVarId]] }, {}, false, false);
    addBlock(notLt, 'operator_not', null, loopId, { OPERAND: [2, ltCond] }, {}, false, false);

    // body block 1: if _st_l mod 2 = 1: result += seg_tree[_st_l]; _st_l++
    const lR_mod = bid();
    const modL = bid();
    const eqMod1L = bid();
    addBlock(lR_mod, 'data_variable', null, modL, {}, { VARIABLE: ['_st_l', lVarId] }, false, false);
    addBlock(modL, 'operator_mod', null, eqMod1L,
      { NUM1: [3, lR_mod, [12, '_st_l', lVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(eqMod1L, 'operator_equals', null, null,
      { OPERAND1: [3, modL, [4, '']], OPERAND2: [1, [4, '1']] }, {}, false, false);

    const lR_item = bid();
    const segL = bid();
    addBlock(lR_item, 'data_variable', null, segL, {}, { VARIABLE: ['_st_l', lVarId] }, false, false);
    addBlock(segL, 'data_itemoflist', null, null,
      { INDEX: [3, lR_item, [7, '']] }, { LIST: ['seg_tree', treeListId] }, false, false);
    const resR_addL = bid();
    addBlock(resR_addL, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const addResL = bid();
    addBlock(addResL, 'operator_add', null, null,
      { NUM1: [3, resR_addL, [12, 'result', resultVarId]], NUM2: [3, segL, [10, '']] }, {}, false, false);
    const setResL = bid();
    addBlock(setResL, 'data_setvariableto', null, null,
      { VALUE: [3, addResL, [4, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    const incL = bid();
    addBlock(incL, 'data_changevariableby', null, setResL,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_st_l', lVarId] }, false, false);
    blocks[setResL].next = incL;
    blocks[incL].parent = setResL;

    const ifL = bid();
    addBlock(ifL, 'control_if', null, null, {
      CONDITION: [2, eqMod1L],
      SUBSTACK: [2, setResL],
    }, {}, false, false);

    // body block 2: if _st_r mod 2 = 1: _st_r--; result += seg_tree[_st_r]
    const rR_mod = bid();
    const modR = bid();
    const eqMod1R = bid();
    addBlock(rR_mod, 'data_variable', null, modR, {}, { VARIABLE: ['_st_r', rVarId] }, false, false);
    addBlock(modR, 'operator_mod', null, eqMod1R,
      { NUM1: [3, rR_mod, [12, '_st_r', rVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(eqMod1R, 'operator_equals', null, null,
      { OPERAND1: [3, modR, [4, '']], OPERAND2: [1, [4, '1']] }, {}, false, false);

    const decR = bid();
    addBlock(decR, 'data_changevariableby', null, null,
      { VALUE: [1, [4, '-1']] }, { VARIABLE: ['_st_r', rVarId] }, false, false);
    const rR_item = bid();
    const segR = bid();
    addBlock(rR_item, 'data_variable', null, segR, {}, { VARIABLE: ['_st_r', rVarId] }, false, false);
    addBlock(segR, 'data_itemoflist', null, null,
      { INDEX: [3, rR_item, [7, '']] }, { LIST: ['seg_tree', treeListId] }, false, false);
    const resR_addR = bid();
    addBlock(resR_addR, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const addResR = bid();
    addBlock(addResR, 'operator_add', null, null,
      { NUM1: [3, resR_addR, [12, 'result', resultVarId]], NUM2: [3, segR, [10, '']] }, {}, false, false);
    const setResR = bid();
    addBlock(setResR, 'data_setvariableto', null, decR,
      { VALUE: [3, addResR, [4, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[decR].next = setResR;
    blocks[setResR].parent = decR;

    const ifR = bid();
    addBlock(ifR, 'control_if', null, null, {
      CONDITION: [2, eqMod1R],
      SUBSTACK: [2, decR],
    }, {}, false, false);

    // _st_l = floor(_st_l/2)
    const lR_shift = bid();
    const divL2 = bid();
    const floorL = bid();
    const setLShift = bid();
    addBlock(lR_shift, 'data_variable', null, divL2, {}, { VARIABLE: ['_st_l', lVarId] }, false, false);
    addBlock(divL2, 'operator_divide', null, floorL,
      { NUM1: [3, lR_shift, [12, '_st_l', lVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(floorL, 'operator_mathop', null, setLShift,
      { NUM: [3, divL2, [4, '']] }, { OPERATOR: ['floor', null] }, false, false);
    addBlock(setLShift, 'data_setvariableto', null, null,
      { VALUE: [3, floorL, [4, '']] }, { VARIABLE: ['_st_l', lVarId] }, false, false);

    // _st_r = floor(_st_r/2)
    const rR_shift = bid();
    const divR2 = bid();
    const floorR = bid();
    const setRShift = bid();
    addBlock(rR_shift, 'data_variable', null, divR2, {}, { VARIABLE: ['_st_r', rVarId] }, false, false);
    addBlock(divR2, 'operator_divide', null, floorR,
      { NUM1: [3, rR_shift, [12, '_st_r', rVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(floorR, 'operator_mathop', null, setRShift,
      { NUM: [3, divR2, [4, '']] }, { OPERATOR: ['floor', null] }, false, false);
    addBlock(setRShift, 'data_setvariableto', null, null,
      { VALUE: [3, floorR, [4, '']] }, { VARIABLE: ['_st_r', rVarId] }, false, false);

    blocks[ifL].next = ifR;
    blocks[ifR].next = setLShift;
    blocks[setLShift].next = setRShift;

    addBlock(loopId, 'control_repeat_until', null, setRId, {
      CONDITION: [2, notLt],
      SUBSTACK: [2, ifL],
    }, {}, false, false);

    // fix remaining parents
    blocks[argLR1].parent = addL;
    blocks[nR_l].parent = addL;
    blocks[addL].parent = sub1L;
    blocks[sub1L].parent = setLId;
    blocks[argRR1].parent = addR;
    blocks[nR_r].parent = addR;
    blocks[addR].parent = setRId;
    blocks[lR_cond].parent = ltCond;
    blocks[rR_cond].parent = ltCond;
    blocks[ltCond].parent = notLt;
    blocks[notLt].parent = loopId;
    blocks[lR_mod].parent = modL;
    blocks[modL].parent = eqMod1L;
    blocks[eqMod1L].parent = ifL;
    blocks[lR_item].parent = segL;
    blocks[segL].parent = addResL;
    blocks[resR_addL].parent = addResL;
    blocks[addResL].parent = setResL;
    blocks[setResL].parent = ifL;
    blocks[ifL].parent = loopId;
    blocks[rR_mod].parent = modR;
    blocks[modR].parent = eqMod1R;
    blocks[eqMod1R].parent = ifR;
    blocks[decR].parent = ifR;
    blocks[rR_item].parent = segR;
    blocks[segR].parent = addResR;
    blocks[resR_addR].parent = addResR;
    blocks[addResR].parent = setResR;
    blocks[ifR].parent = ifL;
    blocks[lR_shift].parent = divL2;
    blocks[divL2].parent = floorL;
    blocks[floorL].parent = setLShift;
    blocks[setLShift].parent = ifR;
    blocks[rR_shift].parent = divR2;
    blocks[divR2].parent = floorR;
    blocks[floorR].parent = setRShift;
    blocks[setRShift].parent = setLShift;
    blocks[setRes0Id].next = setLId;
    blocks[setLId].parent = setRes0Id;
    blocks[setLId].next = setRId;
    blocks[setRId].parent = setLId;
    blocks[setRId].next = loopId;
    blocks[loopId].parent = setRId;
  }

  // ── Procedure 4: size ────────────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const nR = bid();
    const setResId = bid();

    addBlock(defId, 'procedures_definition', setResId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 1000 });
    addBlock(protoId, 'procedures_prototype', null, defId, {}, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'size',
        argumentids: '[]', argumentnames: '[]', argumentdefaults: '[]',
        warp: 'false',
      },
    });

    addBlock(nR, 'data_variable', null, setResId, {}, { VARIABLE: ['_st_n', nVarId] }, false, false);
    addBlock(setResId, 'data_setvariableto', null, defId,
      { VALUE: [3, nR, [12, '_st_n', nVarId]] }, { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[nR].parent = setResId;
  }

  return { lists, variables, blocks };
}
