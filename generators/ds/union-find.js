export function buildUnionFind(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const parentListId = `${spriteId}_parent`;
  const rankListId = `${spriteId}_rank`;
  const resultVarId = `${spriteId}_result`;
  const xVarId = `${spriteId}_uf_x`;
  const cntVarId = `${spriteId}_uf_cnt`;

  const lists = {
    [parentListId]: ['parent', []],
    [rankListId]: ['rank', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
    [xVarId]: ['_uf_x', 0],
    [cntVarId]: ['_uf_cnt', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // ── Procedure 1: init size: %s ────────────────────────────────────────
  // delete all parent/rank
  // set _uf_cnt to 0
  // repeat size:
  //   change _uf_cnt by 1
  //   add _uf_cnt to parent
  //   add 0 to rank
  {
    const defId = bid();
    const protoId = bid();
    const argShadowId = bid();
    const argProcId = `${spriteId}_init_sz`;

    const delParId = bid();
    const delRankId = bid();
    const setCntId = bid();
    const argR = bid();
    const repeatId = bid();
    const incCntId = bid();
    const cntR1 = bid();
    const addParId = bid();
    const addRankId = bid();

    addBlock(defId, 'procedures_definition', delParId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadowId] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'init size: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['size']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadowId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['size', null] }, true, false);

    addBlock(delParId, 'data_deletealloflist', delRankId, defId, {}, { LIST: ['parent', parentListId] }, false, false);
    addBlock(delRankId, 'data_deletealloflist', setCntId, delParId, {}, { LIST: ['rank', rankListId] }, false, false);
    addBlock(setCntId, 'data_setvariableto', repeatId, delRankId,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);

    addBlock(argR, 'argument_reporter_string_number', null, repeatId, {}, { VALUE: ['size', null] }, false, false);
    addBlock(repeatId, 'control_repeat', null, setCntId, {
      TIMES: [3, argR, [6, '']],
      SUBSTACK: [2, incCntId],
    }, {}, false, false);

    addBlock(incCntId, 'data_changevariableby', addParId, repeatId,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);

    addBlock(cntR1, 'data_variable', null, addParId, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    addBlock(addParId, 'data_addtolist', addRankId, incCntId,
      { ITEM: [3, cntR1, [12, '_uf_cnt', cntVarId]] },
      { LIST: ['parent', parentListId] }, false, false);

    addBlock(addRankId, 'data_addtolist', null, addParId,
      { ITEM: [1, [10, '0']] },
      { LIST: ['rank', rankListId] }, false, false);

    blocks[delRankId].parent = delParId;
    blocks[setCntId].parent = delRankId;
    blocks[argR].parent = repeatId;
    blocks[repeatId].parent = setCntId;
    blocks[incCntId].parent = repeatId;
    blocks[cntR1].parent = addParId;
    blocks[addParId].parent = incCntId;
    blocks[addRankId].parent = addParId;
  }

  // Helper: inline find (iterative path-to-root)
  // returns first block id of the sequence, takes defParent and next block
  // sequence: set _uf_x to node; repeat until parent[x]=x: set _uf_x = parent[x]; set result to _uf_x
  function buildFindInline(nodeInput, defParent, nextBlockId) {
    const setXId = bid();
    const loopId = bid();
    const xR_cond1 = bid();
    const xR_cond2 = bid();
    const xParItem = bid();
    const eqId = bid();
    const xR_body = bid();
    const xParItem2 = bid();
    const setXLoopId = bid();
    const xR_res = bid();
    const setResId = bid();

    addBlock(setXId, 'data_setvariableto', loopId, defParent,
      { VALUE: nodeInput }, { VARIABLE: ['_uf_x', xVarId] }, false, false);

    // cond: parent[x] = x  → loop until this is true
    addBlock(xR_cond1, 'data_variable', null, xParItem, {}, { VARIABLE: ['_uf_x', xVarId] }, false, false);
    addBlock(xParItem, 'data_itemoflist', null, eqId,
      { INDEX: [3, xR_cond1, [7, '']] }, { LIST: ['parent', parentListId] }, false, false);
    addBlock(xR_cond2, 'data_variable', null, eqId, {}, { VARIABLE: ['_uf_x', xVarId] }, false, false);
    addBlock(eqId, 'operator_equals', null, loopId,
      { OPERAND1: [3, xParItem, [10, '']], OPERAND2: [3, xR_cond2, [12, '_uf_x', xVarId]] }, {}, false, false);

    // body: set _uf_x to parent[x]
    addBlock(xR_body, 'data_variable', null, xParItem2, {}, { VARIABLE: ['_uf_x', xVarId] }, false, false);
    addBlock(xParItem2, 'data_itemoflist', null, setXLoopId,
      { INDEX: [3, xR_body, [7, '']] }, { LIST: ['parent', parentListId] }, false, false);
    addBlock(setXLoopId, 'data_setvariableto', null, loopId,
      { VALUE: [3, xParItem2, [10, '']] }, { VARIABLE: ['_uf_x', xVarId] }, false, false);

    addBlock(loopId, 'control_repeat_until', setResId, setXId, {
      CONDITION: [2, eqId],
      SUBSTACK: [2, setXLoopId],
    }, {}, false, false);

    // set result to _uf_x
    addBlock(xR_res, 'data_variable', null, setResId, {}, { VARIABLE: ['_uf_x', xVarId] }, false, false);
    addBlock(setResId, 'data_setvariableto', nextBlockId, loopId,
      { VALUE: [3, xR_res, [12, '_uf_x', xVarId]] }, { VARIABLE: ['result', resultVarId] }, false, false);

    blocks[xR_cond1].parent = xParItem;
    blocks[xParItem].parent = eqId;
    blocks[xR_cond2].parent = eqId;
    blocks[eqId].parent = loopId;
    blocks[xR_body].parent = xParItem2;
    blocks[xParItem2].parent = setXLoopId;
    blocks[setXLoopId].parent = loopId;
    blocks[loopId].parent = setXId;
    blocks[xR_res].parent = setResId;
    blocks[setResId].parent = loopId;

    return { first: setXId, last: setResId };
  }

  // ── Procedure 2: find node: %s ────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadowId = bid();
    const argProcId = `${spriteId}_find_nd`;

    addBlock(defId, 'procedures_definition', null, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 400 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadowId] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'find node: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['node']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadowId, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['node', null] }, true, false);

    const argR = bid();
    addBlock(argR, 'argument_reporter_string_number', null, null, {}, { VALUE: ['node', null] }, false, false);

    const { first } = buildFindInline([3, argR, [10, '']], defId, null);
    blocks[defId].next = first;
    blocks[first].parent = defId;
    blocks[argR].parent = first;
  }

  // ── Procedure 3: union a: %s b: %s ───────────────────────────────────
  // find root of a → resA (store in _uf_x temporarily, then save)
  // find root of b → resB
  // union by rank
  {
    const defId = bid();
    const protoId = bid();
    const argAShadow = bid();
    const argBShadow = bid();
    const argAProcId = `${spriteId}_union_a`;
    const argBProcId = `${spriteId}_union_b`;

    // We'll store rootA in a helper variable approach using _uf_x and result
    // Find a, save result as rootA using a separate variable... but we only have _uf_x and result
    // Strategy: find a (result = rootA), then set _uf_cnt (reuse) = rootA, then find b (result = rootB)
    // Then union _uf_cnt vs result

    const argAR = bid();
    const { first: findAFirst, last: findALast } = buildFindInline(null, defId, null);
    // fix arg input after creation
    addBlock(argAR, 'argument_reporter_string_number', null, findAFirst, {}, { VALUE: ['a', null] }, false, false);
    blocks[findAFirst].inputs.VALUE = [3, argAR, [10, '']];

    // save rootA into _uf_cnt (reusing as temp)
    const resR1 = bid();
    const saveRootA = bid();
    addBlock(resR1, 'data_variable', null, saveRootA, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(saveRootA, 'data_setvariableto', null, findALast,
      { VALUE: [3, resR1, [12, 'result', resultVarId]] },
      { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    blocks[resR1].parent = saveRootA;
    blocks[findALast].next = saveRootA;
    blocks[saveRootA].parent = findALast;

    // find b
    const argBR = bid();
    const { first: findBFirst, last: findBLast } = buildFindInline(null, saveRootA, null);
    addBlock(argBR, 'argument_reporter_string_number', null, findBFirst, {}, { VALUE: ['b', null] }, false, false);
    blocks[findBFirst].inputs.VALUE = [3, argBR, [10, '']];
    blocks[saveRootA].next = findBFirst;
    blocks[findBFirst].parent = saveRootA;

    // Now rootA is in _uf_cnt, rootB is in result
    // if rootA = rootB: return (already connected)
    const cntR_eq = bid();
    addBlock(cntR_eq, 'data_variable', null, null, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    const resR_eq = bid();
    addBlock(resR_eq, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const eqAB = bid();
    addBlock(eqAB, 'operator_equals', null, null,
      { OPERAND1: [3, cntR_eq, [12, '_uf_cnt', cntVarId]], OPERAND2: [3, resR_eq, [12, 'result', resultVarId]] },
      {}, false, false);
    const notEqAB = bid();
    addBlock(notEqAB, 'operator_not', null, null, { OPERAND: [2, eqAB] }, {}, false, false);

    // union by rank: rank[rootA] vs rank[rootB]
    // if rank[rootA] < rank[rootB]: parent[rootA] = rootB
    // elif rank[rootA] > rank[rootB]: parent[rootB] = rootA
    // else: parent[rootB] = rootA; rank[rootA]++

    // rank[rootA] = rank at index _uf_cnt
    const cntR_rA = bid();
    const rankAItem = bid();
    addBlock(cntR_rA, 'data_variable', null, rankAItem, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    addBlock(rankAItem, 'data_itemoflist', null, null,
      { INDEX: [3, cntR_rA, [7, '']] }, { LIST: ['rank', rankListId] }, false, false);

    // rank[rootB] = rank at index result
    const resR_rB = bid();
    const rankBItem = bid();
    addBlock(resR_rB, 'data_variable', null, rankBItem, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(rankBItem, 'data_itemoflist', null, null,
      { INDEX: [3, resR_rB, [7, '']] }, { LIST: ['rank', rankListId] }, false, false);

    // case1: rank[rootA] < rank[rootB] → parent[rootA] = rootB
    const ltRAB = bid();
    addBlock(ltRAB, 'operator_lt', null, null,
      { OPERAND1: [3, rankAItem, [10, '']], OPERAND2: [3, rankBItem, [10, '']] }, {}, false, false);

    const cntR_c1 = bid();
    addBlock(cntR_c1, 'data_variable', null, null, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    const resR_c1 = bid();
    addBlock(resR_c1, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const repCase1 = bid(); // replace parent[rootA] with rootB
    addBlock(repCase1, 'data_replaceitemoflist', null, null,
      { INDEX: [3, cntR_c1, [7, '']], ITEM: [3, resR_c1, [12, 'result', resultVarId]] },
      { LIST: ['parent', parentListId] }, false, false);

    // case2: rank[rootA] > rank[rootB] → parent[rootB] = rootA
    const cntR_rA2 = bid();
    const rankAItem2 = bid();
    addBlock(cntR_rA2, 'data_variable', null, rankAItem2, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    addBlock(rankAItem2, 'data_itemoflist', null, null,
      { INDEX: [3, cntR_rA2, [7, '']] }, { LIST: ['rank', rankListId] }, false, false);

    const resR_rB2 = bid();
    const rankBItem2 = bid();
    addBlock(resR_rB2, 'data_variable', null, rankBItem2, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(rankBItem2, 'data_itemoflist', null, null,
      { INDEX: [3, resR_rB2, [7, '']] }, { LIST: ['rank', rankListId] }, false, false);

    const gtRAB = bid();
    addBlock(gtRAB, 'operator_gt', null, null,
      { OPERAND1: [3, rankAItem2, [10, '']], OPERAND2: [3, rankBItem2, [10, '']] }, {}, false, false);

    const resR_c2 = bid();
    addBlock(resR_c2, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const cntR_c2 = bid();
    addBlock(cntR_c2, 'data_variable', null, null, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    const repCase2 = bid(); // replace parent[rootB] with rootA
    addBlock(repCase2, 'data_replaceitemoflist', null, null,
      { INDEX: [3, resR_c2, [7, '']], ITEM: [3, cntR_c2, [12, '_uf_cnt', cntVarId]] },
      { LIST: ['parent', parentListId] }, false, false);

    // case3 (else): parent[rootB] = rootA AND rank[rootA]++
    const resR_c3 = bid();
    addBlock(resR_c3, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const cntR_c3 = bid();
    addBlock(cntR_c3, 'data_variable', null, null, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    const repCase3 = bid();
    addBlock(repCase3, 'data_replaceitemoflist', null, null,
      { INDEX: [3, resR_c3, [7, '']], ITEM: [3, cntR_c3, [12, '_uf_cnt', cntVarId]] },
      { LIST: ['parent', parentListId] }, false, false);
    const cntR_rk = bid();
    addBlock(cntR_rk, 'data_variable', null, null, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    const incRankA = bid();
    addBlock(incRankA, 'data_changevariableby', null, null,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    // Hmm, changing a variable doesn't change the list. Need to use replace.
    // Actually, rank[rootA]++ means: replace rank[rootA] with rank[rootA]+1
    const cntR_rk1 = bid();
    const rankAItem3 = bid();
    addBlock(cntR_rk1, 'data_variable', null, rankAItem3, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    addBlock(rankAItem3, 'data_itemoflist', null, null,
      { INDEX: [3, cntR_rk1, [7, '']] }, { LIST: ['rank', rankListId] }, false, false);
    const addRank1 = bid();
    addBlock(addRank1, 'operator_add', null, null,
      { NUM1: [3, rankAItem3, [10, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    const cntR_rk2 = bid();
    addBlock(cntR_rk2, 'data_variable', null, null, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    const incRankList = bid();
    addBlock(incRankList, 'data_replaceitemoflist', null, repCase3,
      { INDEX: [3, cntR_rk2, [7, '']], ITEM: [3, addRank1, [4, '']] },
      { LIST: ['rank', rankListId] }, false, false);

    // Build nested if-else: if rankA < rankB then case1 else (if rankA > rankB then case2 else case3+inc)
    const innerIfId = bid();
    addBlock(innerIfId, 'control_if_else', null, null, {
      CONDITION: [2, gtRAB],
      SUBSTACK: [2, repCase2],
      SUBSTACK2: [2, repCase3],
    }, {}, false, false);

    const outerIfId = bid();
    addBlock(outerIfId, 'control_if_else', null, null, {
      CONDITION: [2, ltRAB],
      SUBSTACK: [2, repCase1],
      SUBSTACK2: [2, innerIfId],
    }, {}, false, false);

    // wrap in: if (rootA != rootB): outerIf
    const guardIfId = bid();
    addBlock(guardIfId, 'control_if', null, findBLast, {
      CONDITION: [2, notEqAB],
      SUBSTACK: [2, outerIfId],
    }, {}, false, false);

    blocks[findBLast].next = guardIfId;
    blocks[guardIfId].parent = findBLast;

    // fix parents
    blocks[cntR_eq].parent = eqAB;
    blocks[resR_eq].parent = eqAB;
    blocks[eqAB].parent = notEqAB;
    blocks[notEqAB].parent = guardIfId;
    blocks[outerIfId].parent = guardIfId;

    blocks[cntR_rA].parent = rankAItem;
    blocks[rankAItem].parent = ltRAB;
    blocks[resR_rB].parent = rankBItem;
    blocks[rankBItem].parent = ltRAB;
    blocks[ltRAB].parent = outerIfId;
    blocks[cntR_c1].parent = repCase1;
    blocks[resR_c1].parent = repCase1;
    blocks[repCase1].parent = outerIfId;

    blocks[cntR_rA2].parent = rankAItem2;
    blocks[rankAItem2].parent = gtRAB;
    blocks[resR_rB2].parent = rankBItem2;
    blocks[rankBItem2].parent = gtRAB;
    blocks[gtRAB].parent = innerIfId;
    blocks[resR_c2].parent = repCase2;
    blocks[cntR_c2].parent = repCase2;
    blocks[repCase2].parent = innerIfId;

    blocks[resR_c3].parent = repCase3;
    blocks[cntR_c3].parent = repCase3;
    blocks[repCase3].parent = innerIfId;
    blocks[incRankList].parent = repCase3;
    blocks[cntR_rk1].parent = rankAItem3;
    blocks[rankAItem3].parent = addRank1;
    blocks[addRank1].parent = incRankList;
    blocks[cntR_rk2].parent = incRankList;
    blocks[repCase3].next = incRankList;

    blocks[innerIfId].parent = outerIfId;

    addBlock(defId, 'procedures_definition', findAFirst, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 700 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argAProcId]: [2, argAShadow],
      [argBProcId]: [2, argBShadow],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'union a: %s b: %s',
        argumentids: JSON.stringify([argAProcId, argBProcId]),
        argumentnames: JSON.stringify(['a', 'b']),
        argumentdefaults: JSON.stringify(['', '']),
        warp: 'false',
      },
    });
    addBlock(argAShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['a', null] }, true, false);
    addBlock(argBShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['b', null] }, true, false);

    blocks[findAFirst].parent = defId;
    blocks[argAR].parent = findAFirst;
    blocks[argBR].parent = findBFirst;
  }

  // ── Procedure 4: connected? a: %s b: %s ──────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argAShadow = bid();
    const argBShadow = bid();
    const argAProcId = `${spriteId}_conn_a`;
    const argBProcId = `${spriteId}_conn_b`;

    const argAR = bid();
    const { first: findAFirst, last: findALast } = buildFindInline(null, defId, null);
    addBlock(argAR, 'argument_reporter_string_number', null, findAFirst, {}, { VALUE: ['a', null] }, false, false);
    blocks[findAFirst].inputs.VALUE = [3, argAR, [10, '']];

    // save rootA in _uf_cnt
    const resR1 = bid();
    const saveRootA = bid();
    addBlock(resR1, 'data_variable', null, saveRootA, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(saveRootA, 'data_setvariableto', null, findALast,
      { VALUE: [3, resR1, [12, 'result', resultVarId]] },
      { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    blocks[resR1].parent = saveRootA;
    blocks[findALast].next = saveRootA;
    blocks[saveRootA].parent = findALast;

    // find b
    const argBR = bid();
    const { first: findBFirst, last: findBLast } = buildFindInline(null, saveRootA, null);
    addBlock(argBR, 'argument_reporter_string_number', null, findBFirst, {}, { VALUE: ['b', null] }, false, false);
    blocks[findBFirst].inputs.VALUE = [3, argBR, [10, '']];
    blocks[saveRootA].next = findBFirst;
    blocks[findBFirst].parent = saveRootA;

    // compare rootA (_uf_cnt) with rootB (result)
    const cntR_eq = bid();
    addBlock(cntR_eq, 'data_variable', null, null, {}, { VARIABLE: ['_uf_cnt', cntVarId] }, false, false);
    const resR_eq = bid();
    addBlock(resR_eq, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const eqId = bid();
    addBlock(eqId, 'operator_equals', null, null,
      { OPERAND1: [3, cntR_eq, [12, '_uf_cnt', cntVarId]], OPERAND2: [3, resR_eq, [12, 'result', resultVarId]] },
      {}, false, false);

    const setRes1Id = bid();
    const setRes0Id = bid();
    addBlock(setRes1Id, 'data_setvariableto', null, null, { VALUE: [1, [10, '1']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(setRes0Id, 'data_setvariableto', null, null, { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    const ifId = bid();
    addBlock(ifId, 'control_if_else', null, findBLast, {
      CONDITION: [2, eqId],
      SUBSTACK: [2, setRes1Id],
      SUBSTACK2: [2, setRes0Id],
    }, {}, false, false);

    blocks[findBLast].next = ifId;
    blocks[ifId].parent = findBLast;
    blocks[cntR_eq].parent = eqId;
    blocks[resR_eq].parent = eqId;
    blocks[eqId].parent = ifId;
    blocks[setRes1Id].parent = ifId;
    blocks[setRes0Id].parent = ifId;

    addBlock(defId, 'procedures_definition', findAFirst, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 1000 });
    addBlock(protoId, 'procedures_prototype', null, defId, {
      [argAProcId]: [2, argAShadow],
      [argBProcId]: [2, argBShadow],
    }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'connected? a: %s b: %s',
        argumentids: JSON.stringify([argAProcId, argBProcId]),
        argumentnames: JSON.stringify(['a', 'b']),
        argumentdefaults: JSON.stringify(['', '']),
        warp: 'false',
      },
    });
    addBlock(argAShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['a', null] }, true, false);
    addBlock(argBShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['b', null] }, true, false);

    blocks[findAFirst].parent = defId;
    blocks[argAR].parent = findAFirst;
    blocks[argBR].parent = findBFirst;
  }

  return { lists, variables, blocks };
}
