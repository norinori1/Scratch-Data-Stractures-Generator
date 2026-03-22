export function buildTrie(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const parentListId = `${spriteId}_trie_parent`;
  const charListId = `${spriteId}_trie_char`;
  const isEndListId = `${spriteId}_trie_isend`;
  const resultVarId = `${spriteId}_result`;
  const nodeVarId = `${spriteId}_tr_node`;
  const iVarId = `${spriteId}_tr_i`;
  const chVarId = `${spriteId}_tr_ch`;
  const foundVarId = `${spriteId}_tr_found`;

  const lists = {
    [parentListId]: ['trie_parent', []],
    [charListId]: ['trie_char', []],
    [isEndListId]: ['trie_is_end', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
    [nodeVarId]: ['_tr_node', 0],
    [iVarId]: ['_tr_i', 0],
    [chVarId]: ['_tr_ch', 0],
    [foundVarId]: ['_tr_found', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // ── Procedure 1: init ─────────────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const delPar = bid();
    const delChar = bid();
    const delEnd = bid();
    const addPar0 = bid();
    const addChar0 = bid();
    const addEnd0 = bid();

    addBlock(defId, 'procedures_definition', delPar, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
    addBlock(protoId, 'procedures_prototype', null, defId, {}, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'init',
        argumentids: '[]', argumentnames: '[]', argumentdefaults: '[]',
        warp: 'false',
      },
    });

    addBlock(delPar, 'data_deletealloflist', delChar, defId, {}, { LIST: ['trie_parent', parentListId] }, false, false);
    addBlock(delChar, 'data_deletealloflist', delEnd, delPar, {}, { LIST: ['trie_char', charListId] }, false, false);
    addBlock(delEnd, 'data_deletealloflist', addPar0, delChar, {}, { LIST: ['trie_is_end', isEndListId] }, false, false);
    addBlock(addPar0, 'data_addtolist', addChar0, delEnd, { ITEM: [1, [10, '0']] }, { LIST: ['trie_parent', parentListId] }, false, false);
    addBlock(addChar0, 'data_addtolist', addEnd0, addPar0, { ITEM: [1, [10, '']] }, { LIST: ['trie_char', charListId] }, false, false);
    addBlock(addEnd0, 'data_addtolist', null, addChar0, { ITEM: [1, [10, '0']] }, { LIST: ['trie_is_end', isEndListId] }, false, false);
  }

  // Helper: build child-search loop
  // Searches for a child of _tr_node with char = _tr_ch
  // Sets _tr_found = found index (0 if not found), _tr_i = search variable
  // Returns { first, last } block ids
  // Loop: set _tr_i to 1; repeat until _tr_i > length:
  //   if trie_parent[_tr_i] = _tr_node AND trie_char[_tr_i] = _tr_ch: set _tr_found to _tr_i; set _tr_i = length+1
  //   else: change _tr_i by 1
  function buildChildSearch(defParent, nextBlockId) {
    const setFoundId = bid();
    const setI1Id = bid();
    const loopId = bid();

    // loop condition: _tr_i > length of trie_parent
    const iR_gt = bid();
    const lenGt = bid();
    const gtId = bid();

    addBlock(iR_gt, 'data_variable', null, gtId, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(lenGt, 'data_lengthoflist', null, gtId, {}, { LIST: ['trie_parent', parentListId] }, false, false);
    addBlock(gtId, 'operator_gt', null, loopId,
      { OPERAND1: [3, iR_gt, [12, '_tr_i', iVarId]], OPERAND2: [3, lenGt, [6, '']] }, {}, false, false);

    // body: if trie_parent[_tr_i] = _tr_node AND trie_char[_tr_i] = _tr_ch
    const iR_par = bid();
    const parItem = bid();
    addBlock(iR_par, 'data_variable', null, parItem, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(parItem, 'data_itemoflist', null, null,
      { INDEX: [3, iR_par, [7, '']] }, { LIST: ['trie_parent', parentListId] }, false, false);
    const nodeR1 = bid();
    addBlock(nodeR1, 'data_variable', null, null, {}, { VARIABLE: ['_tr_node', nodeVarId] }, false, false);
    const eq1Id = bid();
    addBlock(eq1Id, 'operator_equals', null, null,
      { OPERAND1: [3, parItem, [10, '']], OPERAND2: [3, nodeR1, [12, '_tr_node', nodeVarId]] }, {}, false, false);

    const iR_chr = bid();
    const chrItem = bid();
    addBlock(iR_chr, 'data_variable', null, chrItem, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(chrItem, 'data_itemoflist', null, null,
      { INDEX: [3, iR_chr, [7, '']] }, { LIST: ['trie_char', charListId] }, false, false);
    const chR1 = bid();
    addBlock(chR1, 'data_variable', null, null, {}, { VARIABLE: ['_tr_ch', chVarId] }, false, false);
    const eq2Id = bid();
    addBlock(eq2Id, 'operator_equals', null, null,
      { OPERAND1: [3, chrItem, [10, '']], OPERAND2: [3, chR1, [12, '_tr_ch', chVarId]] }, {}, false, false);

    const andId = bid();
    addBlock(andId, 'operator_and', null, null,
      { OPERAND1: [2, eq1Id], OPERAND2: [2, eq2Id] }, {}, false, false);

    // then: set _tr_found = _tr_i; set _tr_i = length+1 (break)
    const iR_found = bid();
    const setFoundInner = bid();
    addBlock(iR_found, 'data_variable', null, setFoundInner, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(setFoundInner, 'data_setvariableto', null, null,
      { VALUE: [3, iR_found, [12, '_tr_i', iVarId]] },
      { VARIABLE: ['_tr_found', foundVarId] }, false, false);

    // set _tr_i to length+2 (definitely > length)
    const lenBreak = bid();
    const addBreak = bid();
    const setIBreak = bid();
    addBlock(lenBreak, 'data_lengthoflist', null, addBreak, {}, { LIST: ['trie_parent', parentListId] }, false, false);
    addBlock(addBreak, 'operator_add', null, setIBreak,
      { NUM1: [3, lenBreak, [6, '']], NUM2: [1, [4, '2']] }, {}, false, false);
    addBlock(setIBreak, 'data_setvariableto', null, setFoundInner,
      { VALUE: [3, addBreak, [4, '']] }, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    blocks[lenBreak].parent = addBreak;
    blocks[addBreak].parent = setIBreak;
    blocks[setFoundInner].next = setIBreak;
    blocks[setIBreak].parent = setFoundInner;

    // else: change _tr_i by 1
    const incIId = bid();
    addBlock(incIId, 'data_changevariableby', null, null,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_i', iVarId] }, false, false);

    const ifBodyId = bid();
    addBlock(ifBodyId, 'control_if_else', null, loopId, {
      CONDITION: [2, andId],
      SUBSTACK: [2, setFoundInner],
      SUBSTACK2: [2, incIId],
    }, {}, false, false);

    addBlock(loopId, 'control_repeat_until', nextBlockId, setI1Id, {
      CONDITION: [2, gtId],
      SUBSTACK: [2, ifBodyId],
    }, {}, false, false);

    addBlock(setFoundId, 'data_setvariableto', setI1Id, defParent,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_tr_found', foundVarId] }, false, false);

    addBlock(setI1Id, 'data_setvariableto', loopId, setFoundId,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_i', iVarId] }, false, false);

    // fix parents
    blocks[iR_gt].parent = gtId;
    blocks[lenGt].parent = gtId;
    blocks[gtId].parent = loopId;
    blocks[iR_par].parent = parItem;
    blocks[parItem].parent = eq1Id;
    blocks[nodeR1].parent = eq1Id;
    blocks[eq1Id].parent = andId;
    blocks[iR_chr].parent = chrItem;
    blocks[chrItem].parent = eq2Id;
    blocks[chR1].parent = eq2Id;
    blocks[eq2Id].parent = andId;
    blocks[andId].parent = ifBodyId;
    blocks[iR_found].parent = setFoundInner;
    blocks[setFoundInner].parent = ifBodyId;
    blocks[incIId].parent = ifBodyId;
    blocks[ifBodyId].parent = loopId;
    blocks[setI1Id].parent = setFoundId;

    return { first: setFoundId, last: loopId };
  }

  // ── Procedure 2: insert word: %s ──────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_ins_word`;

    // set _tr_node to 1
    const setNode1 = bid();
    // set _tr_i to 1  (will be reused as char loop counter here with a different var)
    // Actually let's use a separate outer loop approach:
    // set _tr_i to 1 (outer char index); _tr_ch = letter _tr_i of word
    // repeat len(word) times:
    //   set _tr_ch to letter _tr_i of word
    //   search for child (inner buildChildSearch modifies _tr_i)
    //   if _tr_found = 0: create new node; set _tr_node = len(trie)
    //   else: set _tr_node = _tr_found
    //   change outer counter

    // We'll use a "repeat N times" loop for the word characters
    const argRLen = bid();
    const lenWord = bid();
    const outerRepeatId = bid();

    // outer loop counter using a separate variable... we only have _tr_i and _tr_ch
    // Trick: use _tr_i as the character index in outer loop, then inner search saves/restores

    // Set _tr_node = 1
    addBlock(setNode1, 'data_setvariableto', null, defId,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_node', nodeVarId] }, false, false);

    // We'll use a different approach: use a repeat-N loop with _tr_i as outer index
    // set outer_i = 1
    const setOuterI = bid();
    addBlock(setOuterI, 'data_setvariableto', outerRepeatId, setNode1,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    blocks[setNode1].next = setOuterI;

    // loop condition: _tr_i > length of word
    const outerIR = bid();
    const argRLen2 = bid();
    const wordLen2 = bid();
    const outerGt = bid();
    addBlock(argRLen2, 'argument_reporter_string_number', null, wordLen2, {}, { VALUE: ['word', null] }, false, false);
    addBlock(wordLen2, 'operator_length', null, outerGt, { STRING: [3, argRLen2, [10, '']] }, {}, false, false);
    addBlock(outerIR, 'data_variable', null, outerGt, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(outerGt, 'operator_gt', null, outerRepeatId,
      { OPERAND1: [3, outerIR, [12, '_tr_i', iVarId]], OPERAND2: [3, wordLen2, [4, '']] }, {}, false, false);

    // body of outer loop:
    // set _tr_ch to letter _tr_i of word
    const setChId = bid();
    const outerIR2 = bid();
    const argRWord = bid();
    const letterOfId = bid();
    addBlock(outerIR2, 'data_variable', null, letterOfId, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(argRWord, 'argument_reporter_string_number', null, letterOfId, {}, { VALUE: ['word', null] }, false, false);
    addBlock(letterOfId, 'operator_letterof', null, setChId,
      { LETTER: [3, outerIR2, [6, '']], STRING: [3, argRWord, [10, '']] }, {}, false, false);
    addBlock(setChId, 'data_setvariableto', null, outerRepeatId,
      { VALUE: [3, letterOfId, [10, '']] }, { VARIABLE: ['_tr_ch', chVarId] }, false, false);
    blocks[outerIR2].parent = letterOfId;
    blocks[argRWord].parent = letterOfId;
    blocks[letterOfId].parent = setChId;

    // save _tr_i to _tr_found before inner search (we need outer index back after inner modifies _tr_i)
    const saveIId = bid();
    const outerIR3 = bid();
    addBlock(outerIR3, 'data_variable', null, saveIId, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(saveIId, 'data_setvariableto', null, setChId,
      { VALUE: [3, outerIR3, [12, '_tr_i', iVarId]] },
      { VARIABLE: ['_tr_found', foundVarId] }, false, false);
    blocks[outerIR3].parent = saveIId;
    blocks[setChId].next = saveIId;

    // inner search: searches for child; modifies _tr_i and _tr_found
    // But _tr_found is being used as outer index save! Use a different approach:
    // Actually let's just rebuild: we'll inline the child search differently.
    // Let's do a simple: set _tr_found = 0; set searchI = 1; loop searchI <= len...
    // But we don't have an extra variable. Let's reuse result temporarily.

    // Save outer index _tr_i into result (it will be overwritten by search but we'll restore)
    const saveOuter = bid();
    const outerIR4 = bid();
    addBlock(outerIR4, 'data_variable', null, saveOuter, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(saveOuter, 'data_setvariableto', null, saveIId,
      { VALUE: [3, outerIR4, [12, '_tr_i', iVarId]] },
      { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[outerIR4].parent = saveOuter;
    blocks[saveIId].next = saveOuter;
    blocks[saveOuter].parent = saveIId;

    // inner search (modifies _tr_i, sets _tr_found)
    const { first: searchFirst, last: searchLast } = buildChildSearch(saveOuter, null);
    blocks[saveOuter].next = searchFirst;
    blocks[searchFirst].parent = saveOuter;

    // restore outer index from result
    const restoreId = bid();
    const resR_restore = bid();
    addBlock(resR_restore, 'data_variable', null, restoreId, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(restoreId, 'data_setvariableto', null, searchLast,
      { VALUE: [3, resR_restore, [12, 'result', resultVarId]] },
      { VARIABLE: ['_tr_i', iVarId] }, false, false);
    blocks[resR_restore].parent = restoreId;
    blocks[searchLast].next = restoreId;
    blocks[restoreId].parent = searchLast;

    // if _tr_found = 0: create new node; else: set _tr_node = _tr_found
    const foundR1 = bid();
    const eqFoundZero = bid();
    addBlock(foundR1, 'data_variable', null, eqFoundZero, {}, { VARIABLE: ['_tr_found', foundVarId] }, false, false);
    addBlock(eqFoundZero, 'operator_equals', null, null,
      { OPERAND1: [3, foundR1, [12, '_tr_found', foundVarId]], OPERAND2: [1, [4, '0']] }, {}, false, false);

    // then-branch: add node to trie
    const nodeR_par = bid();
    addBlock(nodeR_par, 'data_variable', null, null, {}, { VARIABLE: ['_tr_node', nodeVarId] }, false, false);
    const addParNode = bid();
    addBlock(addParNode, 'data_addtolist', null, null,
      { ITEM: [3, nodeR_par, [12, '_tr_node', nodeVarId]] },
      { LIST: ['trie_parent', parentListId] }, false, false);
    const chR_add = bid();
    addBlock(chR_add, 'data_variable', null, null, {}, { VARIABLE: ['_tr_ch', chVarId] }, false, false);
    const addCharNode = bid();
    addBlock(addCharNode, 'data_addtolist', null, addParNode,
      { ITEM: [3, chR_add, [12, '_tr_ch', chVarId]] },
      { LIST: ['trie_char', charListId] }, false, false);
    const addEndNode = bid();
    addBlock(addEndNode, 'data_addtolist', null, addCharNode,
      { ITEM: [1, [10, '0']] },
      { LIST: ['trie_is_end', isEndListId] }, false, false);
    blocks[addParNode].next = addCharNode;
    blocks[addCharNode].next = addEndNode;
    blocks[nodeR_par].parent = addParNode;
    blocks[chR_add].parent = addCharNode;

    // set _tr_node to length of trie_parent
    const lenNode = bid();
    const setNodeNew = bid();
    addBlock(lenNode, 'data_lengthoflist', null, setNodeNew, {}, { LIST: ['trie_parent', parentListId] }, false, false);
    addBlock(setNodeNew, 'data_setvariableto', null, addEndNode,
      { VALUE: [3, lenNode, [6, '']] }, { VARIABLE: ['_tr_node', nodeVarId] }, false, false);
    blocks[addEndNode].next = setNodeNew;
    blocks[lenNode].parent = setNodeNew;
    blocks[setNodeNew].parent = addEndNode;
    blocks[addParNode].parent = null; // will fix below

    // else-branch: set _tr_node = _tr_found
    const foundR2 = bid();
    const setNodeFound = bid();
    addBlock(foundR2, 'data_variable', null, setNodeFound, {}, { VARIABLE: ['_tr_found', foundVarId] }, false, false);
    addBlock(setNodeFound, 'data_setvariableto', null, null,
      { VALUE: [3, foundR2, [12, '_tr_found', foundVarId]] },
      { VARIABLE: ['_tr_node', nodeVarId] }, false, false);
    blocks[foundR2].parent = setNodeFound;

    const ifCreateId = bid();
    addBlock(ifCreateId, 'control_if_else', null, restoreId, {
      CONDITION: [2, eqFoundZero],
      SUBSTACK: [2, addParNode],
      SUBSTACK2: [2, setNodeFound],
    }, {}, false, false);

    blocks[restoreId].next = ifCreateId;
    blocks[ifCreateId].parent = restoreId;
    blocks[foundR1].parent = eqFoundZero;
    blocks[eqFoundZero].parent = ifCreateId;
    blocks[addParNode].parent = ifCreateId;
    blocks[setNodeFound].parent = ifCreateId;

    // increment outer _tr_i
    const incOuterI = bid();
    addBlock(incOuterI, 'data_changevariableby', null, ifCreateId,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    blocks[ifCreateId].next = incOuterI;
    blocks[incOuterI].parent = ifCreateId;

    addBlock(outerRepeatId, 'control_repeat_until', null, setOuterI, {
      CONDITION: [2, outerGt],
      SUBSTACK: [2, setChId],
    }, {}, false, false);

    blocks[outerIR].parent = outerGt;
    blocks[argRLen2].parent = wordLen2;
    blocks[wordLen2].parent = outerGt;
    blocks[outerGt].parent = outerRepeatId;
    blocks[setChId].parent = outerRepeatId;
    blocks[setOuterI].next = outerRepeatId;
    blocks[setOuterI].parent = setNode1;

    // after loop: replace trie_is_end[_tr_node] with 1
    const nodeR_end = bid();
    const repEndId = bid();
    addBlock(nodeR_end, 'data_variable', null, repEndId, {}, { VARIABLE: ['_tr_node', nodeVarId] }, false, false);
    addBlock(repEndId, 'data_replaceitemoflist', null, outerRepeatId,
      { INDEX: [3, nodeR_end, [7, '']], ITEM: [1, [10, '1']] },
      { LIST: ['trie_is_end', isEndListId] }, false, false);
    blocks[outerRepeatId].next = repEndId;
    blocks[repEndId].parent = outerRepeatId;
    blocks[nodeR_end].parent = repEndId;

    addBlock(defId, 'procedures_definition', setNode1, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 200 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'insert word: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['word']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['word', null] }, true, false);

    blocks[setNode1].parent = defId;
    blocks[setOuterI].parent = setNode1;
  }

  // ── Helper: traverse word/prefix ──────────────────────────────────────
  // set _tr_node=1; outer loop over chars; set _tr_ch; save outer; search child; restore outer
  // if not found: set result=0; done
  // Returns { first, last } and sets result at the end based on flag
  function buildTraverse(argProcId, defParent, endCheck) {
    // set _tr_node = 1
    const setNode = bid();
    addBlock(setNode, 'data_setvariableto', null, defParent,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_node', nodeVarId] }, false, false);

    // set result = 1 (assume success; set to 0 on failure)
    const setResInit = bid();
    addBlock(setResInit, 'data_setvariableto', null, setNode,
      { VALUE: [1, [10, '1']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[setNode].next = setResInit;
    blocks[setResInit].parent = setNode;

    // outer loop: i from 1 to length of word
    const setOuterI = bid();
    addBlock(setOuterI, 'data_setvariableto', null, setResInit,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    blocks[setResInit].next = setOuterI;
    blocks[setOuterI].parent = setResInit;

    // loop condition: _tr_i > length(word) OR result = 0
    const outerIR = bid();
    const argRLen = bid();
    const wordLen = bid();
    const gtCond = bid();
    addBlock(argRLen, 'argument_reporter_string_number', null, wordLen, {}, { VALUE: [argProcId === 'word' ? 'word' : 'prefix', null] }, false, false);
    addBlock(wordLen, 'operator_length', null, gtCond, { STRING: [3, argRLen, [10, '']] }, {}, false, false);
    addBlock(outerIR, 'data_variable', null, gtCond, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(gtCond, 'operator_gt', null, null,
      { OPERAND1: [3, outerIR, [12, '_tr_i', iVarId]], OPERAND2: [3, wordLen, [4, '']] }, {}, false, false);

    const resR_or = bid();
    addBlock(resR_or, 'data_variable', null, null, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    const eqRes0 = bid();
    addBlock(eqRes0, 'operator_equals', null, null,
      { OPERAND1: [3, resR_or, [12, 'result', resultVarId]], OPERAND2: [1, [4, '0']] }, {}, false, false);

    const orId = bid();
    addBlock(orId, 'operator_or', null, null,
      { OPERAND1: [2, gtCond], OPERAND2: [2, eqRes0] }, {}, false, false);

    // body: set _tr_ch = letter _tr_i of word
    const outerIR2 = bid();
    const argRWord = bid();
    const letterOf = bid();
    const setCh = bid();
    addBlock(outerIR2, 'data_variable', null, letterOf, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(argRWord, 'argument_reporter_string_number', null, letterOf, {}, { VALUE: [argProcId === 'word' ? 'word' : 'prefix', null] }, false, false);
    addBlock(letterOf, 'operator_letterof', null, setCh,
      { LETTER: [3, outerIR2, [6, '']], STRING: [3, argRWord, [10, '']] }, {}, false, false);
    addBlock(setCh, 'data_setvariableto', null, null,
      { VALUE: [3, letterOf, [10, '']] }, { VARIABLE: ['_tr_ch', chVarId] }, false, false);
    blocks[outerIR2].parent = letterOf;
    blocks[argRWord].parent = letterOf;
    blocks[letterOf].parent = setCh;

    // save outer i to result
    const outerIR3 = bid();
    const saveOuter = bid();
    addBlock(outerIR3, 'data_variable', null, saveOuter, {}, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    addBlock(saveOuter, 'data_setvariableto', null, setCh,
      { VALUE: [3, outerIR3, [12, '_tr_i', iVarId]] },
      { VARIABLE: ['result', resultVarId] }, false, false);
    blocks[outerIR3].parent = saveOuter;
    blocks[setCh].next = saveOuter;
    blocks[saveOuter].parent = setCh;

    // inner search
    const { first: searchFirst, last: searchLast } = buildChildSearch(saveOuter, null);
    blocks[saveOuter].next = searchFirst;
    blocks[searchFirst].parent = saveOuter;

    // restore outer i
    const resR_rest = bid();
    const restoreI = bid();
    addBlock(resR_rest, 'data_variable', null, restoreI, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(restoreI, 'data_setvariableto', null, searchLast,
      { VALUE: [3, resR_rest, [12, 'result', resultVarId]] },
      { VARIABLE: ['_tr_i', iVarId] }, false, false);
    blocks[resR_rest].parent = restoreI;
    blocks[searchLast].next = restoreI;
    blocks[restoreI].parent = searchLast;

    // if _tr_found = 0: set result = 0; else: set _tr_node = _tr_found
    const foundR1 = bid();
    const eqF0 = bid();
    addBlock(foundR1, 'data_variable', null, eqF0, {}, { VARIABLE: ['_tr_found', foundVarId] }, false, false);
    addBlock(eqF0, 'operator_equals', null, null,
      { OPERAND1: [3, foundR1, [12, '_tr_found', foundVarId]], OPERAND2: [1, [4, '0']] }, {}, false, false);

    const setRes0 = bid();
    addBlock(setRes0, 'data_setvariableto', null, null,
      { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    const foundR2 = bid();
    const setNodeFound = bid();
    addBlock(foundR2, 'data_variable', null, setNodeFound, {}, { VARIABLE: ['_tr_found', foundVarId] }, false, false);
    addBlock(setNodeFound, 'data_setvariableto', null, null,
      { VALUE: [3, foundR2, [12, '_tr_found', foundVarId]] },
      { VARIABLE: ['_tr_node', nodeVarId] }, false, false);
    blocks[foundR2].parent = setNodeFound;

    const ifFoundId = bid();
    addBlock(ifFoundId, 'control_if_else', null, restoreI, {
      CONDITION: [2, eqF0],
      SUBSTACK: [2, setRes0],
      SUBSTACK2: [2, setNodeFound],
    }, {}, false, false);
    blocks[restoreI].next = ifFoundId;
    blocks[ifFoundId].parent = restoreI;
    blocks[foundR1].parent = eqF0;
    blocks[eqF0].parent = ifFoundId;
    blocks[setRes0].parent = ifFoundId;
    blocks[setNodeFound].parent = ifFoundId;

    // increment outer i
    const incI = bid();
    addBlock(incI, 'data_changevariableby', null, ifFoundId,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_tr_i', iVarId] }, false, false);
    blocks[ifFoundId].next = incI;
    blocks[incI].parent = ifFoundId;

    const outerLoop = bid();
    addBlock(outerLoop, 'control_repeat_until', null, setOuterI, {
      CONDITION: [2, orId],
      SUBSTACK: [2, setCh],
    }, {}, false, false);
    blocks[setOuterI].next = outerLoop;
    blocks[outerLoop].parent = setOuterI;

    blocks[outerIR].parent = gtCond;
    blocks[argRLen].parent = wordLen;
    blocks[wordLen].parent = gtCond;
    blocks[gtCond].parent = orId;
    blocks[resR_or].parent = eqRes0;
    blocks[eqRes0].parent = orId;
    blocks[orId].parent = outerLoop;
    blocks[setCh].parent = outerLoop;

    return { first: setNode, outerLoop };
  }

  // ── Procedure 3: search word: %s ─────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_srch_word`;

    const { first, outerLoop } = buildTraverse('word', defId, true);
    blocks[first].parent = defId;

    // After loop: if result = 1: check trie_is_end[_tr_node]; else result stays 0
    const resR_after = bid();
    const eqRes1 = bid();
    addBlock(resR_after, 'data_variable', null, eqRes1, {}, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(eqRes1, 'operator_equals', null, null,
      { OPERAND1: [3, resR_after, [12, 'result', resultVarId]], OPERAND2: [1, [4, '1']] }, {}, false, false);

    const nodeR_chk = bid();
    const isEndItem = bid();
    const eqIsEnd1 = bid();
    addBlock(nodeR_chk, 'data_variable', null, isEndItem, {}, { VARIABLE: ['_tr_node', nodeVarId] }, false, false);
    addBlock(isEndItem, 'data_itemoflist', null, eqIsEnd1,
      { INDEX: [3, nodeR_chk, [7, '']] }, { LIST: ['trie_is_end', isEndListId] }, false, false);
    addBlock(eqIsEnd1, 'operator_equals', null, null,
      { OPERAND1: [3, isEndItem, [10, '']], OPERAND2: [1, [10, '1']] }, {}, false, false);

    const setRes1 = bid();
    addBlock(setRes1, 'data_setvariableto', null, null,
      { VALUE: [1, [10, '1']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    const setRes0 = bid();
    addBlock(setRes0, 'data_setvariableto', null, null,
      { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    const ifIsEnd = bid();
    addBlock(ifIsEnd, 'control_if_else', null, null, {
      CONDITION: [2, eqIsEnd1],
      SUBSTACK: [2, setRes1],
      SUBSTACK2: [2, setRes0],
    }, {}, false, false);
    blocks[nodeR_chk].parent = isEndItem;
    blocks[isEndItem].parent = eqIsEnd1;
    blocks[eqIsEnd1].parent = ifIsEnd;
    blocks[setRes1].parent = ifIsEnd;
    blocks[setRes0].parent = ifIsEnd;

    const setRes0Outer = bid();
    addBlock(setRes0Outer, 'data_setvariableto', null, null,
      { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    const ifOuter = bid();
    addBlock(ifOuter, 'control_if_else', null, outerLoop, {
      CONDITION: [2, eqRes1],
      SUBSTACK: [2, ifIsEnd],
      SUBSTACK2: [2, setRes0Outer],
    }, {}, false, false);

    blocks[outerLoop].next = ifOuter;
    blocks[ifOuter].parent = outerLoop;
    blocks[resR_after].parent = eqRes1;
    blocks[eqRes1].parent = ifOuter;
    blocks[ifIsEnd].parent = ifOuter;
    blocks[setRes0Outer].parent = ifOuter;

    addBlock(defId, 'procedures_definition', first, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 700 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'search word: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['word']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['word', null] }, true, false);
  }

  // ── Procedure 4: starts-with prefix: %s ──────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_sw_prefix`;

    const { first, outerLoop } = buildTraverse('prefix', defId, false);
    blocks[first].parent = defId;

    // After loop: result already is 1 if all chars found, 0 if not (set during traversal)

    addBlock(defId, 'procedures_definition', first, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 1100 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'starts-with prefix: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['prefix']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['prefix', null] }, true, false);
  }

  return { lists, variables, blocks };
}
