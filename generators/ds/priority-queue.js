export function buildPriorityQueue(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const heapListId = `${spriteId}_heap`;
  const resultVarId = `${spriteId}_result`;
  const sizeVarId = `${spriteId}_pq_size`;
  const iVarId = `${spriteId}_pq_i`;
  const jVarId = `${spriteId}_pq_j`;
  const tempVarId = `${spriteId}_pq_temp`;

  const lists = {
    [heapListId]: ['heap', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
    [sizeVarId]: ['_pq_size', 0],
    [iVarId]: ['_pq_i', 0],
    [jVarId]: ['_pq_j', 0],
    [tempVarId]: ['_pq_temp', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // Helper: build a variable reporter inline
  function varRef(varName, varId, parent) {
    const id = bid();
    addBlock(id, 'data_variable', null, parent, {}, { VARIABLE: [varName, varId] }, false, false);
    return id;
  }

  function listLen(listName, listId, parent) {
    const id = bid();
    addBlock(id, 'data_lengthoflist', null, parent, {}, { LIST: [listName, listId] }, false, false);
    return id;
  }

  function itemOf(listName, listId, indexInput, parent) {
    const id = bid();
    addBlock(id, 'data_itemoflist', null, parent, { INDEX: indexInput }, { LIST: [listName, listId] }, false, false);
    return id;
  }

  function mathFloor(numInput, parent) {
    const id = bid();
    addBlock(id, 'operator_mathop', null, parent, { NUM: numInput }, { OPERATOR: ['floor', null] }, false, false);
    return id;
  }

  function opDiv(n1, n2, parent) {
    const id = bid();
    addBlock(id, 'operator_divide', null, parent, { NUM1: n1, NUM2: n2 }, {}, false, false);
    return id;
  }

  function opMul(n1, n2, parent) {
    const id = bid();
    addBlock(id, 'operator_multiply', null, parent, { NUM1: n1, NUM2: n2 }, {}, false, false);
    return id;
  }

  function opAdd(n1, n2, parent) {
    const id = bid();
    addBlock(id, 'operator_add', null, parent, { NUM1: n1, NUM2: n2 }, {}, false, false);
    return id;
  }

  function opGt(o1, o2, parent) {
    const id = bid();
    addBlock(id, 'operator_gt', null, parent, { OPERAND1: o1, OPERAND2: o2 }, {}, false, false);
    return id;
  }

  function opLt(o1, o2, parent) {
    const id = bid();
    addBlock(id, 'operator_lt', null, parent, { OPERAND1: o1, OPERAND2: o2 }, {}, false, false);
    return id;
  }

  function opAnd(o1, o2, parent) {
    const id = bid();
    addBlock(id, 'operator_and', null, parent, { OPERAND1: o1, OPERAND2: o2 }, {}, false, false);
    return id;
  }

  // Fix parent references after creation using placeholder
  // We'll fix parents inline instead.

  // ── Procedure 1: push value: %s ──────────────────────────────────────
  // Logic:
  //   add value to heap
  //   set _pq_i to (length of heap)
  //   repeat until (_pq_i <= 1) or (heap[floor(_pq_i/2)] <= heap[_pq_i]):
  //     set _pq_temp to heap[floor(_pq_i/2)]
  //     replace heap[floor(_pq_i/2)] with heap[_pq_i]
  //     replace heap[_pq_i] with _pq_temp
  //     set _pq_i to floor(_pq_i/2)
  {
    const defId = bid();
    const protoId = bid();
    const argShadowId = bid();
    const argProcId = `${spriteId}_push_val`;

    const argR = bid();
    const addId = bid();

    // set _pq_i to length of heap
    const lenForI = bid();
    const setIId = bid();

    // repeat-until condition: _pq_i <= 1 OR parent >= child
    // condition = NOT (_pq_i > 1 AND heap[floor(i/2)] > heap[i])
    const loopId = bid();

    // body: swap heap[floor(i/2)] with heap[i], then i = floor(i/2)
    // set _pq_temp = heap[floor(i/2)]
    const setTempId = bid();
    // replace heap[floor(i/2)] with heap[i]
    const replParentId = bid();
    // replace heap[i] with _pq_temp
    const replChildId = bid();
    // set _pq_i to floor(_pq_i / 2)
    const setINewId = bid();

    addBlock(defId, 'procedures_definition', addId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadowId] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'push value: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['value']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadowId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['value', null] }, true, false);

    addBlock(argR, 'argument_reporter_string_number', null, addId, {}, { VALUE: ['value', null] }, false, false);
    addBlock(addId, 'data_addtolist', setIId, defId,
      { ITEM: [3, argR, [10, '']] },
      { LIST: ['heap', heapListId] }, false, false);

    blocks[argR].parent = addId;

    // set _pq_i to (length of heap)
    addBlock(lenForI, 'data_lengthoflist', null, setIId, {}, { LIST: ['heap', heapListId] }, false, false);
    addBlock(setIId, 'data_setvariableto', loopId, addId,
      { VALUE: [3, lenForI, [6, '']] },
      { VARIABLE: ['_pq_i', iVarId] }, false, false);
    blocks[lenForI].parent = setIId;

    // Loop condition: NOT (_pq_i > 1 AND heap[floor(i/2)] > heap[i])
    // We build: _pq_i > 1
    const gt1Id = bid();
    const iR_gt1 = bid();
    addBlock(iR_gt1, 'data_variable', null, gt1Id, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    addBlock(gt1Id, 'operator_gt', null, null,  // parent = andId
      { OPERAND1: [3, iR_gt1, [12, '_pq_i', iVarId]], OPERAND2: [1, [4, '1']] }, {}, false, false);

    // heap[floor(i/2)] > heap[i]
    // floor(i/2):
    const iRdiv_cond = bid();
    addBlock(iRdiv_cond, 'data_variable', null, null, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    const divId_cond = bid();
    addBlock(divId_cond, 'operator_divide', null, null,
      { NUM1: [3, iRdiv_cond, [12, '_pq_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    const floorId_cond = bid();
    addBlock(floorId_cond, 'operator_mathop', null, null,
      { NUM: [3, divId_cond, [4, '']] }, { OPERATOR: ['floor', null] }, false, false);

    const parentItemId = bid();
    addBlock(parentItemId, 'data_itemoflist', null, null,
      { INDEX: [3, floorId_cond, [7, '']] },
      { LIST: ['heap', heapListId] }, false, false);

    const iR_childItem = bid();
    addBlock(iR_childItem, 'data_variable', null, null, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    const childItemId = bid();
    addBlock(childItemId, 'data_itemoflist', null, null,
      { INDEX: [3, iR_childItem, [7, '']] },
      { LIST: ['heap', heapListId] }, false, false);

    const gt2Id = bid();
    addBlock(gt2Id, 'operator_gt', null, null,
      { OPERAND1: [3, parentItemId, [10, '']], OPERAND2: [3, childItemId, [10, '']] }, {}, false, false);

    const andId = bid();
    addBlock(andId, 'operator_and', null, loopId,
      { OPERAND1: [2, gt1Id], OPERAND2: [2, gt2Id] }, {}, false, false);

    const notId = bid();
    addBlock(notId, 'operator_not', null, loopId,
      { OPERAND: [2, andId] }, {}, false, false);

    // Fix parents for condition tree
    blocks[iR_gt1].parent = gt1Id;
    blocks[gt1Id].parent = andId;
    blocks[iRdiv_cond].parent = divId_cond;
    blocks[divId_cond].parent = floorId_cond;
    blocks[floorId_cond].parent = parentItemId;
    blocks[parentItemId].parent = gt2Id;
    blocks[iR_childItem].parent = childItemId;
    blocks[childItemId].parent = gt2Id;
    blocks[gt2Id].parent = andId;
    blocks[andId].parent = notId;
    blocks[notId].parent = loopId;

    // Loop body:
    // set _pq_temp = heap[floor(i/2)]
    const iRdiv_b1 = bid();
    addBlock(iRdiv_b1, 'data_variable', null, null, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    const divB1 = bid();
    addBlock(divB1, 'operator_divide', null, null,
      { NUM1: [3, iRdiv_b1, [12, '_pq_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    const floorB1 = bid();
    addBlock(floorB1, 'operator_mathop', null, null,
      { NUM: [3, divB1, [4, '']] }, { OPERATOR: ['floor', null] }, false, false);
    const parentItemB1 = bid();
    addBlock(parentItemB1, 'data_itemoflist', null, setTempId,
      { INDEX: [3, floorB1, [7, '']] },
      { LIST: ['heap', heapListId] }, false, false);
    addBlock(setTempId, 'data_setvariableto', replParentId, loopId,
      { VALUE: [3, parentItemB1, [10, '']] },
      { VARIABLE: ['_pq_temp', tempVarId] }, false, false);
    blocks[iRdiv_b1].parent = divB1;
    blocks[divB1].parent = floorB1;
    blocks[floorB1].parent = parentItemB1;
    blocks[parentItemB1].parent = setTempId;

    // replace heap[floor(i/2)] with heap[i]
    const iRdiv_b2 = bid();
    addBlock(iRdiv_b2, 'data_variable', null, null, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    const divB2 = bid();
    addBlock(divB2, 'operator_divide', null, null,
      { NUM1: [3, iRdiv_b2, [12, '_pq_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    const floorB2 = bid();
    addBlock(floorB2, 'operator_mathop', null, null,
      { NUM: [3, divB2, [4, '']] }, { OPERATOR: ['floor', null] }, false, false);
    const iR_ci = bid();
    addBlock(iR_ci, 'data_variable', null, null, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    const childItemB2 = bid();
    addBlock(childItemB2, 'data_itemoflist', null, replParentId,
      { INDEX: [3, iR_ci, [7, '']] },
      { LIST: ['heap', heapListId] }, false, false);
    addBlock(replParentId, 'data_replaceitemoflist', replChildId, setTempId,
      { INDEX: [3, floorB2, [7, '']], ITEM: [3, childItemB2, [10, '']] },
      { LIST: ['heap', heapListId] }, false, false);
    blocks[iRdiv_b2].parent = divB2;
    blocks[divB2].parent = floorB2;
    blocks[floorB2].parent = replParentId;
    blocks[iR_ci].parent = childItemB2;
    blocks[childItemB2].parent = replParentId;

    // replace heap[i] with _pq_temp
    const iR_b3 = bid();
    addBlock(iR_b3, 'data_variable', null, replChildId, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    const tempR = bid();
    addBlock(tempR, 'data_variable', null, replChildId, {}, { VARIABLE: ['_pq_temp', tempVarId] }, false, false);
    addBlock(replChildId, 'data_replaceitemoflist', setINewId, replParentId,
      { INDEX: [3, iR_b3, [7, '']], ITEM: [3, tempR, [12, '_pq_temp', tempVarId]] },
      { LIST: ['heap', heapListId] }, false, false);
    blocks[iR_b3].parent = replChildId;
    blocks[tempR].parent = replChildId;

    // set _pq_i to floor(_pq_i / 2)
    const iR_new = bid();
    addBlock(iR_new, 'data_variable', null, null, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    const divNew = bid();
    addBlock(divNew, 'operator_divide', null, null,
      { NUM1: [3, iR_new, [12, '_pq_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    const floorNew = bid();
    addBlock(floorNew, 'operator_mathop', null, setINewId,
      { NUM: [3, divNew, [4, '']] }, { OPERATOR: ['floor', null] }, false, false);
    addBlock(setINewId, 'data_setvariableto', null, replChildId,
      { VALUE: [3, floorNew, [4, '']] },
      { VARIABLE: ['_pq_i', iVarId] }, false, false);
    blocks[iR_new].parent = divNew;
    blocks[divNew].parent = floorNew;
    blocks[floorNew].parent = setINewId;

    addBlock(loopId, 'control_repeat_until', null, setIId, {
      CONDITION: [2, notId],
      SUBSTACK: [2, setTempId],
    }, {}, false, false);

    blocks[setIId].next = loopId;
    blocks[setTempId].parent = loopId;
    blocks[replParentId].parent = setTempId;
    blocks[replChildId].parent = replParentId;
    blocks[setINewId].parent = replChildId;
  }

  // ── Procedure 2: pop-min ──────────────────────────────────────────────
  // Logic:
  //   set result to heap[1]
  //   set _pq_size to (length of heap)
  //   if _pq_size > 1: replace heap[1] with heap[_pq_size]
  //   delete _pq_size of heap
  //   set _pq_i to 1
  //   repeat until (_pq_i * 2 > length of heap):
  //     set _pq_j to _pq_i * 2  (left child)
  //     if _pq_j + 1 <= length of heap AND heap[_pq_j+1] < heap[_pq_j]: set _pq_j to _pq_j+1
  //     if heap[_pq_j] < heap[_pq_i]: swap; set _pq_i to _pq_j
  //     else: break (set _pq_i to length+1 to exit loop)
  {
    const defId = bid();
    const protoId = bid();

    const item1Id = bid();
    const setResId = bid();

    const lenSz = bid();
    const setSzId = bid();

    // if _pq_size > 1: replace heap[1] with heap[_pq_size]
    const szR_gt1 = bid();
    const gt1Id = bid();
    const szR_rep = bid();
    const heapSzItem = bid();
    const repH1Id = bid();
    const ifGtId = bid();

    // delete _pq_size of heap
    const szR_del = bid();
    const delId = bid();

    // set _pq_i to 1
    const setI1Id = bid();

    // loop: repeat until _pq_i * 2 > length of heap
    const loopId = bid();
    const iR_loop = bid();
    const mulId_loop = bid();
    const lenLoop = bid();
    const gtLoopId = bid();

    // body:
    // set _pq_j to _pq_i * 2
    const iR_mul = bid();
    const mulId = bid();
    const setJId = bid();

    // if _pq_j+1 <= len AND heap[_pq_j+1] < heap[_pq_j]: set _pq_j = _pq_j+1
    const jR_p1a = bid();
    const addJ1a = bid();
    const lenJ1 = bid();
    const leId = bid();
    const jR_p1b = bid();
    const addJ1b = bid();
    const itemJp1 = bid();
    const jR_jb = bid();
    const itemJ = bid();
    const ltJId = bid();
    const andJId = bid();
    const jR_inc = bid();
    const addJ1c = bid();
    const setJIncId = bid();
    const ifJId = bid();

    // if heap[_pq_j] < heap[_pq_i]: swap
    const jR_lt = bid();
    const itemJlt = bid();
    const iR_lt = bid();
    const itemIlt = bid();
    const ltCmpId = bid();
    const setTempId = bid();
    const itemJrep = bid();
    const jR_rp1 = bid();
    const repJId = bid();
    const iR_rp = bid();
    const tempRrp = bid();
    const repIId = bid();
    const jR_newi = bid();
    const setInewId = bid();
    const lenBreak = bid();
    const addBreak = bid();
    const setIBreak = bid();
    const ifSwapId = bid();

    addBlock(defId, 'procedures_definition', setResId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 500 });
    addBlock(protoId, 'procedures_prototype', null, defId, {}, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'pop-min',
        argumentids: '[]',
        argumentnames: '[]',
        argumentdefaults: '[]',
        warp: 'false',
      },
    });

    // set result to heap[1]
    addBlock(item1Id, 'data_itemoflist', null, setResId, { INDEX: [1, [7, '1']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(setResId, 'data_setvariableto', setSzId, defId,
      { VALUE: [3, item1Id, [10, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[item1Id].parent = setResId;

    // set _pq_size to length of heap
    addBlock(lenSz, 'data_lengthoflist', null, setSzId, {}, { LIST: ['heap', heapListId] }, false, false);
    addBlock(setSzId, 'data_setvariableto', ifGtId, setResId,
      { VALUE: [3, lenSz, [6, '']] }, { VARIABLE: ['_pq_size', sizeVarId] }, false, false);
    blocks[lenSz].parent = setSzId;

    // if _pq_size > 1
    addBlock(szR_gt1, 'data_variable', null, gt1Id, {}, { VARIABLE: ['_pq_size', sizeVarId] }, false, false);
    addBlock(gt1Id, 'operator_gt', null, ifGtId,
      { OPERAND1: [3, szR_gt1, [12, '_pq_size', sizeVarId]], OPERAND2: [1, [4, '1']] }, {}, false, false);

    // replace heap[1] with heap[_pq_size]
    addBlock(szR_rep, 'data_variable', null, heapSzItem, {}, { VARIABLE: ['_pq_size', sizeVarId] }, false, false);
    addBlock(heapSzItem, 'data_itemoflist', null, repH1Id,
      { INDEX: [3, szR_rep, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(repH1Id, 'data_replaceitemoflist', null, ifGtId,
      { INDEX: [1, [7, '1']], ITEM: [3, heapSzItem, [10, '']] },
      { LIST: ['heap', heapListId] }, false, false);

    addBlock(ifGtId, 'control_if', delId, setSzId, {
      CONDITION: [2, gt1Id],
      SUBSTACK: [2, repH1Id],
    }, {}, false, false);

    blocks[szR_gt1].parent = gt1Id;
    blocks[gt1Id].parent = ifGtId;
    blocks[szR_rep].parent = heapSzItem;
    blocks[heapSzItem].parent = repH1Id;
    blocks[repH1Id].parent = ifGtId;

    // delete _pq_size of heap
    addBlock(szR_del, 'data_variable', null, delId, {}, { VARIABLE: ['_pq_size', sizeVarId] }, false, false);
    addBlock(delId, 'data_deleteoflist', setI1Id, ifGtId,
      { INDEX: [3, szR_del, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    blocks[szR_del].parent = delId;
    blocks[delId].parent = ifGtId;

    // set _pq_i to 1
    addBlock(setI1Id, 'data_setvariableto', loopId, delId,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_pq_i', iVarId] }, false, false);

    // loop condition: _pq_i * 2 > length of heap
    addBlock(iR_loop, 'data_variable', null, mulId_loop, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    addBlock(mulId_loop, 'operator_multiply', null, gtLoopId,
      { NUM1: [3, iR_loop, [12, '_pq_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(lenLoop, 'data_lengthoflist', null, gtLoopId, {}, { LIST: ['heap', heapListId] }, false, false);
    addBlock(gtLoopId, 'operator_gt', null, loopId,
      { OPERAND1: [3, mulId_loop, [4, '']], OPERAND2: [3, lenLoop, [6, '']] }, {}, false, false);

    blocks[iR_loop].parent = mulId_loop;
    blocks[mulId_loop].parent = gtLoopId;
    blocks[lenLoop].parent = gtLoopId;
    blocks[gtLoopId].parent = loopId;

    // loop body: set _pq_j to _pq_i * 2
    addBlock(iR_mul, 'data_variable', null, mulId, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    addBlock(mulId, 'operator_multiply', null, setJId,
      { NUM1: [3, iR_mul, [12, '_pq_i', iVarId]], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(setJId, 'data_setvariableto', ifJId, loopId,
      { VALUE: [3, mulId, [4, '']] }, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    blocks[iR_mul].parent = mulId;
    blocks[mulId].parent = setJId;

    // condition: _pq_j+1 <= len AND heap[j+1] < heap[j]
    addBlock(jR_p1a, 'data_variable', null, addJ1a, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    addBlock(addJ1a, 'operator_add', null, leId,
      { NUM1: [3, jR_p1a, [12, '_pq_j', jVarId]], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(lenJ1, 'data_lengthoflist', null, leId, {}, { LIST: ['heap', heapListId] }, false, false);
    // use operator_not(operator_gt) for <=
    const notGtId = bid();
    addBlock(leId, 'operator_gt', null, notGtId,
      { OPERAND1: [3, addJ1a, [4, '']], OPERAND2: [3, lenJ1, [6, '']] }, {}, false, false);
    addBlock(notGtId, 'operator_not', null, andJId, { OPERAND: [2, leId] }, {}, false, false);

    addBlock(jR_p1b, 'data_variable', null, addJ1b, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    addBlock(addJ1b, 'operator_add', null, itemJp1,
      { NUM1: [3, jR_p1b, [12, '_pq_j', jVarId]], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(itemJp1, 'data_itemoflist', null, ltJId,
      { INDEX: [3, addJ1b, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(jR_jb, 'data_variable', null, itemJ, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    addBlock(itemJ, 'data_itemoflist', null, ltJId,
      { INDEX: [3, jR_jb, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(ltJId, 'operator_lt', null, andJId,
      { OPERAND1: [3, itemJp1, [10, '']], OPERAND2: [3, itemJ, [10, '']] }, {}, false, false);
    addBlock(andJId, 'operator_and', null, ifJId,
      { OPERAND1: [2, notGtId], OPERAND2: [2, ltJId] }, {}, false, false);

    // then: set _pq_j to _pq_j + 1
    addBlock(jR_inc, 'data_variable', null, addJ1c, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    addBlock(addJ1c, 'operator_add', null, setJIncId,
      { NUM1: [3, jR_inc, [12, '_pq_j', jVarId]], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(setJIncId, 'data_setvariableto', null, ifJId,
      { VALUE: [3, addJ1c, [4, '']] }, { VARIABLE: ['_pq_j', jVarId] }, false, false);

    addBlock(ifJId, 'control_if', ifSwapId, setJId, {
      CONDITION: [2, andJId],
      SUBSTACK: [2, setJIncId],
    }, {}, false, false);

    blocks[jR_p1a].parent = addJ1a;
    blocks[addJ1a].parent = leId;
    blocks[lenJ1].parent = leId;
    blocks[leId].parent = notGtId;
    blocks[notGtId].parent = andJId;
    blocks[jR_p1b].parent = addJ1b;
    blocks[addJ1b].parent = itemJp1;
    blocks[itemJp1].parent = ltJId;
    blocks[jR_jb].parent = itemJ;
    blocks[itemJ].parent = ltJId;
    blocks[ltJId].parent = andJId;
    blocks[andJId].parent = ifJId;
    blocks[jR_inc].parent = addJ1c;
    blocks[addJ1c].parent = setJIncId;
    blocks[setJIncId].parent = ifJId;
    blocks[setJId].next = ifJId;

    // if heap[j] < heap[i]: swap
    addBlock(jR_lt, 'data_variable', null, itemJlt, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    addBlock(itemJlt, 'data_itemoflist', null, ltCmpId,
      { INDEX: [3, jR_lt, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(iR_lt, 'data_variable', null, itemIlt, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    addBlock(itemIlt, 'data_itemoflist', null, ltCmpId,
      { INDEX: [3, iR_lt, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(ltCmpId, 'operator_lt', null, ifSwapId,
      { OPERAND1: [3, itemJlt, [10, '']], OPERAND2: [3, itemIlt, [10, '']] }, {}, false, false);

    // then-swap body:
    // set _pq_temp = heap[i]
    const iR_st = bid();
    const itemISt = bid();
    addBlock(iR_st, 'data_variable', null, itemISt, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    addBlock(itemISt, 'data_itemoflist', null, setTempId,
      { INDEX: [3, iR_st, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(setTempId, 'data_setvariableto', repJId, ifSwapId,
      { VALUE: [3, itemISt, [10, '']] }, { VARIABLE: ['_pq_temp', tempVarId] }, false, false);
    blocks[iR_st].parent = itemISt;
    blocks[itemISt].parent = setTempId;

    // replace heap[i] with heap[j]
    addBlock(jR_rp1, 'data_variable', null, itemJrep, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    addBlock(itemJrep, 'data_itemoflist', null, repJId,
      { INDEX: [3, jR_rp1, [7, '']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(iR_rp, 'data_variable', null, repJId, {}, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    addBlock(repJId, 'data_replaceitemoflist', repIId, setTempId,
      { INDEX: [3, iR_rp, [7, '']], ITEM: [3, itemJrep, [10, '']] },
      { LIST: ['heap', heapListId] }, false, false);
    blocks[jR_rp1].parent = itemJrep;
    blocks[itemJrep].parent = repJId;
    blocks[iR_rp].parent = repJId;

    // replace heap[j] with _pq_temp
    addBlock(jR_newi, 'data_variable', null, repIId, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    addBlock(tempRrp, 'data_variable', null, repIId, {}, { VARIABLE: ['_pq_temp', tempVarId] }, false, false);
    addBlock(repIId, 'data_replaceitemoflist', setInewId, repJId,
      { INDEX: [3, jR_newi, [7, '']], ITEM: [3, tempRrp, [12, '_pq_temp', tempVarId]] },
      { LIST: ['heap', heapListId] }, false, false);
    blocks[jR_newi].parent = repIId;
    blocks[tempRrp].parent = repIId;

    // set _pq_i to _pq_j
    addBlock(setInewId, 'data_setvariableto', null, repIId,
      { VALUE: [3, null, [12, '_pq_j', jVarId]] },
      { VARIABLE: ['_pq_i', iVarId] }, false, false);
    // Actually use a variable reporter for _pq_j
    const jRFinal = bid();
    addBlock(jRFinal, 'data_variable', null, setInewId, {}, { VARIABLE: ['_pq_j', jVarId] }, false, false);
    blocks[setInewId].inputs.VALUE = [3, jRFinal, [12, '_pq_j', jVarId]];
    blocks[jRFinal].parent = setInewId;

    // else-break body: set _pq_i to length+1
    addBlock(lenBreak, 'data_lengthoflist', null, addBreak, {}, { LIST: ['heap', heapListId] }, false, false);
    addBlock(addBreak, 'operator_add', null, setIBreak,
      { NUM1: [3, lenBreak, [6, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(setIBreak, 'data_setvariableto', null, ifSwapId,
      { VALUE: [3, addBreak, [4, '']] }, { VARIABLE: ['_pq_i', iVarId] }, false, false);
    blocks[lenBreak].parent = addBreak;
    blocks[addBreak].parent = setIBreak;

    addBlock(ifSwapId, 'control_if_else', null, ifJId, {
      CONDITION: [2, ltCmpId],
      SUBSTACK: [2, setTempId],
      SUBSTACK2: [2, setIBreak],
    }, {}, false, false);

    blocks[jR_lt].parent = itemJlt;
    blocks[itemJlt].parent = ltCmpId;
    blocks[iR_lt].parent = itemIlt;
    blocks[itemIlt].parent = ltCmpId;
    blocks[ltCmpId].parent = ifSwapId;
    blocks[setTempId].parent = ifSwapId;
    blocks[repJId].parent = setTempId;
    blocks[repIId].parent = repJId;
    blocks[setInewId].parent = repIId;
    blocks[setIBreak].parent = ifSwapId;
    blocks[ifJId].next = ifSwapId;
    blocks[ifSwapId].parent = ifJId;

    addBlock(loopId, 'control_repeat_until', null, setI1Id, {
      CONDITION: [2, gtLoopId],
      SUBSTACK: [2, setJId],
    }, {}, false, false);

    blocks[setI1Id].next = loopId;
    blocks[setJId].parent = loopId;
    blocks[setSzId].next = ifGtId;
    blocks[ifGtId].parent = setSzId;
    blocks[delId].parent = ifGtId;
    blocks[setI1Id].parent = delId;
    blocks[loopId].parent = setI1Id;
  }

  // ── Procedure 3: peek-min ─────────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const itemId = bid();
    const setResId = bid();

    addBlock(defId, 'procedures_definition', setResId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 1000 });
    addBlock(protoId, 'procedures_prototype', null, defId, {}, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'peek-min',
        argumentids: '[]',
        argumentnames: '[]',
        argumentdefaults: '[]',
        warp: 'false',
      },
    });

    addBlock(itemId, 'data_itemoflist', null, setResId, { INDEX: [1, [7, '1']] }, { LIST: ['heap', heapListId] }, false, false);
    addBlock(setResId, 'data_setvariableto', null, defId,
      { VALUE: [3, itemId, [10, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[itemId].parent = setResId;
  }

  // ── Procedure 4: size ────────────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const lenId = bid();
    const setResId = bid();

    addBlock(defId, 'procedures_definition', setResId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 1150 });
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

    addBlock(lenId, 'data_lengthoflist', null, setResId, {}, { LIST: ['heap', heapListId] }, false, false);
    addBlock(setResId, 'data_setvariableto', null, defId,
      { VALUE: [3, lenId, [6, '']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[lenId].parent = setResId;
  }

  return { lists, variables, blocks };
}
