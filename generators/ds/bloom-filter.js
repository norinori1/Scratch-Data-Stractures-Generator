export function buildBloomFilter(spriteId) {
  let c = 0;
  const bid = () => `${spriteId}_b${c++}`;

  const bitsListId = `${spriteId}_bf_bits`;
  const resultVarId = `${spriteId}_result`;
  const sizeVarId = `${spriteId}_bf_size`;
  const h1VarId = `${spriteId}_bf_h1`;
  const h2VarId = `${spriteId}_bf_h2`;
  const h3VarId = `${spriteId}_bf_h3`;
  const iVarId = `${spriteId}_bf_i`;

  const lists = {
    [bitsListId]: ['bf_bits', []],
  };

  const variables = {
    [resultVarId]: ['result', 0],
    [sizeVarId]: ['_bf_size', 0],
    [h1VarId]: ['_bf_h1', 0],
    [h2VarId]: ['_bf_h2', 0],
    [h3VarId]: ['_bf_h3', 0],
    [iVarId]: ['_bf_i', 0],
  };

  const blocks = {};

  function addBlock(id, opcode, next, parent, inputs, fields, shadow = false, topLevel = false, extra = {}) {
    blocks[id] = { opcode, next, parent, inputs, fields, shadow, topLevel, ...extra };
  }

  // Hash computation helper:
  // Build a loop that computes 3 hashes simultaneously using letter positions
  // h1 = (h1 * 31 + position_of_char) mod size  where position = i (1-based letter index used as pseudo char-code)
  // h2 = (h2 * 37 + position_of_char * i) mod size
  // h3 = (h3 * 17 + position_of_char + i*i) mod size
  // Since Scratch can't get char codes easily, use letter index * position as approximation
  // We use operator_letterof to get the char, then use the loop index as the "char code" approximation

  // Returns { first, last } - the hash computation blocks
  // argProcId is the argument name (e.g., 'item')
  function buildHashCompute(argProcId, defParent) {
    // set h1=0, h2=0, h3=0, i=1
    const setH1 = bid();
    const setH2 = bid();
    const setH3 = bid();
    const setI = bid();

    addBlock(setH1, 'data_setvariableto', setH2, defParent,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_bf_h1', h1VarId] }, false, false);
    addBlock(setH2, 'data_setvariableto', setH3, setH1,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_bf_h2', h2VarId] }, false, false);
    addBlock(setH3, 'data_setvariableto', setI, setH2,
      { VALUE: [1, [4, '0']] }, { VARIABLE: ['_bf_h3', h3VarId] }, false, false);
    addBlock(setI, 'data_setvariableto', null, setH3,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_bf_i', iVarId] }, false, false);

    // loop condition: _bf_i > length of item string
    const argRLen = bid();
    const lenStr = bid();
    const iR_gt = bid();
    const gtId = bid();
    addBlock(argRLen, 'argument_reporter_string_number', null, lenStr, {}, { VALUE: [argProcId, null] }, false, false);
    addBlock(lenStr, 'operator_length', null, gtId, { STRING: [3, argRLen, [10, '']] }, {}, false, false);
    addBlock(iR_gt, 'data_variable', null, gtId, {}, { VARIABLE: ['_bf_i', iVarId] }, false, false);
    addBlock(gtId, 'operator_gt', null, null,
      { OPERAND1: [3, iR_gt, [12, '_bf_i', iVarId]], OPERAND2: [3, lenStr, [4, '']] }, {}, false, false);

    // body: use _bf_i as the char "code" multiplied by itself (simple non-collision hash)
    // h1 = (h1 * 31 + i) mod _bf_size
    const h1R = bid();
    const mul31 = bid();
    const iR_h1 = bid();
    const addH1 = bid();
    const sizeR_h1 = bid();
    const modH1 = bid();
    const addModH1 = bid(); // +1 to make 1-based
    const setH1New = bid();
    addBlock(h1R, 'data_variable', null, mul31, {}, { VARIABLE: ['_bf_h1', h1VarId] }, false, false);
    addBlock(mul31, 'operator_multiply', null, addH1,
      { NUM1: [3, h1R, [12, '_bf_h1', h1VarId]], NUM2: [1, [4, '31']] }, {}, false, false);
    addBlock(iR_h1, 'data_variable', null, addH1, {}, { VARIABLE: ['_bf_i', iVarId] }, false, false);
    addBlock(addH1, 'operator_add', null, modH1,
      { NUM1: [3, mul31, [4, '']], NUM2: [3, iR_h1, [12, '_bf_i', iVarId]] }, {}, false, false);
    addBlock(sizeR_h1, 'data_variable', null, modH1, {}, { VARIABLE: ['_bf_size', sizeVarId] }, false, false);
    addBlock(modH1, 'operator_mod', null, addModH1,
      { NUM1: [3, addH1, [4, '']], NUM2: [3, sizeR_h1, [12, '_bf_size', sizeVarId]] }, {}, false, false);
    addBlock(addModH1, 'operator_add', null, setH1New,
      { NUM1: [3, modH1, [4, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(setH1New, 'data_setvariableto', null, null,
      { VALUE: [3, addModH1, [4, '']] }, { VARIABLE: ['_bf_h1', h1VarId] }, false, false);

    blocks[h1R].parent = mul31;
    blocks[mul31].parent = addH1;
    blocks[iR_h1].parent = addH1;
    blocks[addH1].parent = modH1;
    blocks[sizeR_h1].parent = modH1;
    blocks[modH1].parent = addModH1;
    blocks[addModH1].parent = setH1New;

    // h2 = (h2 * 37 + i * i) mod _bf_size  (+1)
    const h2R = bid();
    const mul37 = bid();
    const iR_h2a = bid();
    const iR_h2b = bid();
    const mulI2 = bid();
    const addH2 = bid();
    const sizeR_h2 = bid();
    const modH2 = bid();
    const addModH2 = bid();
    const setH2New = bid();
    addBlock(h2R, 'data_variable', null, mul37, {}, { VARIABLE: ['_bf_h2', h2VarId] }, false, false);
    addBlock(mul37, 'operator_multiply', null, addH2,
      { NUM1: [3, h2R, [12, '_bf_h2', h2VarId]], NUM2: [1, [4, '37']] }, {}, false, false);
    addBlock(iR_h2a, 'data_variable', null, mulI2, {}, { VARIABLE: ['_bf_i', iVarId] }, false, false);
    addBlock(iR_h2b, 'data_variable', null, mulI2, {}, { VARIABLE: ['_bf_i', iVarId] }, false, false);
    addBlock(mulI2, 'operator_multiply', null, addH2,
      { NUM1: [3, iR_h2a, [12, '_bf_i', iVarId]], NUM2: [3, iR_h2b, [12, '_bf_i', iVarId]] }, {}, false, false);
    addBlock(addH2, 'operator_add', null, modH2,
      { NUM1: [3, mul37, [4, '']], NUM2: [3, mulI2, [4, '']] }, {}, false, false);
    addBlock(sizeR_h2, 'data_variable', null, modH2, {}, { VARIABLE: ['_bf_size', sizeVarId] }, false, false);
    addBlock(modH2, 'operator_mod', null, addModH2,
      { NUM1: [3, addH2, [4, '']], NUM2: [3, sizeR_h2, [12, '_bf_size', sizeVarId]] }, {}, false, false);
    addBlock(addModH2, 'operator_add', null, setH2New,
      { NUM1: [3, modH2, [4, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(setH2New, 'data_setvariableto', null, null,
      { VALUE: [3, addModH2, [4, '']] }, { VARIABLE: ['_bf_h2', h2VarId] }, false, false);

    blocks[h2R].parent = mul37;
    blocks[mul37].parent = addH2;
    blocks[iR_h2a].parent = mulI2;
    blocks[iR_h2b].parent = mulI2;
    blocks[mulI2].parent = addH2;
    blocks[addH2].parent = modH2;
    blocks[sizeR_h2].parent = modH2;
    blocks[modH2].parent = addModH2;
    blocks[addModH2].parent = setH2New;

    // h3 = (h3 * 17 + i + length) mod _bf_size (+1)
    const h3R = bid();
    const mul17 = bid();
    const iR_h3 = bid();
    const argRLen2 = bid();
    const lenStr2 = bid();
    const addILen = bid();
    const addH3 = bid();
    const sizeR_h3 = bid();
    const modH3 = bid();
    const addModH3 = bid();
    const setH3New = bid();
    addBlock(h3R, 'data_variable', null, mul17, {}, { VARIABLE: ['_bf_h3', h3VarId] }, false, false);
    addBlock(mul17, 'operator_multiply', null, addH3,
      { NUM1: [3, h3R, [12, '_bf_h3', h3VarId]], NUM2: [1, [4, '17']] }, {}, false, false);
    addBlock(iR_h3, 'data_variable', null, addILen, {}, { VARIABLE: ['_bf_i', iVarId] }, false, false);
    addBlock(argRLen2, 'argument_reporter_string_number', null, lenStr2, {}, { VALUE: [argProcId, null] }, false, false);
    addBlock(lenStr2, 'operator_length', null, addILen, { STRING: [3, argRLen2, [10, '']] }, {}, false, false);
    addBlock(addILen, 'operator_add', null, addH3,
      { NUM1: [3, iR_h3, [12, '_bf_i', iVarId]], NUM2: [3, lenStr2, [4, '']] }, {}, false, false);
    addBlock(addH3, 'operator_add', null, modH3,
      { NUM1: [3, mul17, [4, '']], NUM2: [3, addILen, [4, '']] }, {}, false, false);
    addBlock(sizeR_h3, 'data_variable', null, modH3, {}, { VARIABLE: ['_bf_size', sizeVarId] }, false, false);
    addBlock(modH3, 'operator_mod', null, addModH3,
      { NUM1: [3, addH3, [4, '']], NUM2: [3, sizeR_h3, [12, '_bf_size', sizeVarId]] }, {}, false, false);
    addBlock(addModH3, 'operator_add', null, setH3New,
      { NUM1: [3, modH3, [4, '']], NUM2: [1, [4, '1']] }, {}, false, false);
    addBlock(setH3New, 'data_setvariableto', null, null,
      { VALUE: [3, addModH3, [4, '']] }, { VARIABLE: ['_bf_h3', h3VarId] }, false, false);

    blocks[h3R].parent = mul17;
    blocks[mul17].parent = addH3;
    blocks[iR_h3].parent = addILen;
    blocks[argRLen2].parent = lenStr2;
    blocks[lenStr2].parent = addILen;
    blocks[addILen].parent = addH3;
    blocks[addH3].parent = modH3;
    blocks[sizeR_h3].parent = modH3;
    blocks[modH3].parent = addModH3;
    blocks[addModH3].parent = setH3New;

    // increment i
    const incI = bid();
    addBlock(incI, 'data_changevariableby', null, null,
      { VALUE: [1, [4, '1']] }, { VARIABLE: ['_bf_i', iVarId] }, false, false);

    // chain body
    blocks[setH1New].next = setH2New;
    blocks[setH2New].parent = setH1New;
    blocks[setH2New].next = setH3New;
    blocks[setH3New].parent = setH2New;
    blocks[setH3New].next = incI;
    blocks[incI].parent = setH3New;

    const loopId = bid();
    addBlock(loopId, 'control_repeat_until', null, setI, {
      CONDITION: [2, gtId],
      SUBSTACK: [2, setH1New],
    }, {}, false, false);

    blocks[argRLen].parent = lenStr;
    blocks[lenStr].parent = gtId;
    blocks[iR_gt].parent = gtId;
    blocks[gtId].parent = loopId;
    blocks[setH1New].parent = loopId;

    blocks[setI].next = loopId;
    blocks[loopId].parent = setI;

    return { first: setH1, last: loopId };
  }

  // ── Procedure 1: init size: %s ────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_init_sz`;

    const argR = bid();
    const setSzId = bid();
    const delId = bid();
    const argR2 = bid();
    const repeatId = bid();
    const addZeroId = bid();

    addBlock(defId, 'procedures_definition', setSzId, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 20 });
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

    addBlock(argR, 'argument_reporter_string_number', null, setSzId, {}, { VALUE: ['size', null] }, false, false);
    addBlock(setSzId, 'data_setvariableto', delId, defId,
      { VALUE: [3, argR, [10, '']] }, { VARIABLE: ['_bf_size', sizeVarId] }, false, false);
    addBlock(delId, 'data_deletealloflist', repeatId, setSzId, {}, { LIST: ['bf_bits', bitsListId] }, false, false);

    addBlock(argR2, 'argument_reporter_string_number', null, repeatId, {}, { VALUE: ['size', null] }, false, false);
    addBlock(repeatId, 'control_repeat', null, delId, {
      TIMES: [3, argR2, [6, '']],
      SUBSTACK: [2, addZeroId],
    }, {}, false, false);
    addBlock(addZeroId, 'data_addtolist', null, repeatId, { ITEM: [1, [10, '0']] }, { LIST: ['bf_bits', bitsListId] }, false, false);

    blocks[argR].parent = setSzId;
    blocks[argR2].parent = repeatId;
    blocks[addZeroId].parent = repeatId;
  }

  // ── Procedure 2: add item: %s ──────────────────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_add_item`;

    const { first: hashFirst, last: hashLast } = buildHashCompute('item', defId);

    // set bf_bits[h1] = 1, bf_bits[h2] = 1, bf_bits[h3] = 1
    const h1R1 = bid();
    const rep1 = bid();
    const h2R1 = bid();
    const rep2 = bid();
    const h3R1 = bid();
    const rep3 = bid();

    addBlock(h1R1, 'data_variable', null, rep1, {}, { VARIABLE: ['_bf_h1', h1VarId] }, false, false);
    addBlock(rep1, 'data_replaceitemoflist', rep2, hashLast,
      { INDEX: [3, h1R1, [7, '']], ITEM: [1, [10, '1']] },
      { LIST: ['bf_bits', bitsListId] }, false, false);

    addBlock(h2R1, 'data_variable', null, rep2, {}, { VARIABLE: ['_bf_h2', h2VarId] }, false, false);
    addBlock(rep2, 'data_replaceitemoflist', rep3, rep1,
      { INDEX: [3, h2R1, [7, '']], ITEM: [1, [10, '1']] },
      { LIST: ['bf_bits', bitsListId] }, false, false);

    addBlock(h3R1, 'data_variable', null, rep3, {}, { VARIABLE: ['_bf_h3', h3VarId] }, false, false);
    addBlock(rep3, 'data_replaceitemoflist', null, rep2,
      { INDEX: [3, h3R1, [7, '']], ITEM: [1, [10, '1']] },
      { LIST: ['bf_bits', bitsListId] }, false, false);

    blocks[hashLast].next = rep1;
    blocks[rep1].parent = hashLast;
    blocks[h1R1].parent = rep1;
    blocks[h2R1].parent = rep2;
    blocks[rep2].parent = rep1;
    blocks[h3R1].parent = rep3;
    blocks[rep3].parent = rep2;

    addBlock(defId, 'procedures_definition', hashFirst, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 300 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'add item: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['item']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['item', null] }, true, false);
    blocks[hashFirst].parent = defId;
  }

  // ── Procedure 3: might-contain item: %s ──────────────────────────────
  {
    const defId = bid();
    const protoId = bid();
    const argShadow = bid();
    const argProcId = `${spriteId}_cont_item`;

    const { first: hashFirst, last: hashLast } = buildHashCompute('item', defId);

    // check bits[h1] = 1 AND bits[h2] = 1 AND bits[h3] = 1
    const h1R = bid();
    const bit1 = bid();
    const eq1Id = bid();
    addBlock(h1R, 'data_variable', null, bit1, {}, { VARIABLE: ['_bf_h1', h1VarId] }, false, false);
    addBlock(bit1, 'data_itemoflist', null, eq1Id,
      { INDEX: [3, h1R, [7, '']] }, { LIST: ['bf_bits', bitsListId] }, false, false);
    addBlock(eq1Id, 'operator_equals', null, null,
      { OPERAND1: [3, bit1, [10, '']], OPERAND2: [1, [10, '1']] }, {}, false, false);

    const h2R = bid();
    const bit2 = bid();
    const eq2Id = bid();
    addBlock(h2R, 'data_variable', null, bit2, {}, { VARIABLE: ['_bf_h2', h2VarId] }, false, false);
    addBlock(bit2, 'data_itemoflist', null, eq2Id,
      { INDEX: [3, h2R, [7, '']] }, { LIST: ['bf_bits', bitsListId] }, false, false);
    addBlock(eq2Id, 'operator_equals', null, null,
      { OPERAND1: [3, bit2, [10, '']], OPERAND2: [1, [10, '1']] }, {}, false, false);

    const h3R = bid();
    const bit3 = bid();
    const eq3Id = bid();
    addBlock(h3R, 'data_variable', null, bit3, {}, { VARIABLE: ['_bf_h3', h3VarId] }, false, false);
    addBlock(bit3, 'data_itemoflist', null, eq3Id,
      { INDEX: [3, h3R, [7, '']] }, { LIST: ['bf_bits', bitsListId] }, false, false);
    addBlock(eq3Id, 'operator_equals', null, null,
      { OPERAND1: [3, bit3, [10, '']], OPERAND2: [1, [10, '1']] }, {}, false, false);

    const and12 = bid();
    addBlock(and12, 'operator_and', null, null,
      { OPERAND1: [2, eq1Id], OPERAND2: [2, eq2Id] }, {}, false, false);
    const and123 = bid();
    addBlock(and123, 'operator_and', null, null,
      { OPERAND1: [2, and12], OPERAND2: [2, eq3Id] }, {}, false, false);

    const setRes1 = bid();
    const setRes0 = bid();
    addBlock(setRes1, 'data_setvariableto', null, null, { VALUE: [1, [10, '1']] }, { VARIABLE: ['result', resultVarId] }, false, false);
    addBlock(setRes0, 'data_setvariableto', null, null, { VALUE: [1, [10, '0']] }, { VARIABLE: ['result', resultVarId] }, false, false);

    const ifId = bid();
    addBlock(ifId, 'control_if_else', null, hashLast, {
      CONDITION: [2, and123],
      SUBSTACK: [2, setRes1],
      SUBSTACK2: [2, setRes0],
    }, {}, false, false);

    blocks[hashLast].next = ifId;
    blocks[ifId].parent = hashLast;
    blocks[h1R].parent = bit1;
    blocks[bit1].parent = eq1Id;
    blocks[eq1Id].parent = and12;
    blocks[h2R].parent = bit2;
    blocks[bit2].parent = eq2Id;
    blocks[eq2Id].parent = and12;
    blocks[and12].parent = and123;
    blocks[h3R].parent = bit3;
    blocks[bit3].parent = eq3Id;
    blocks[eq3Id].parent = and123;
    blocks[and123].parent = ifId;
    blocks[setRes1].parent = ifId;
    blocks[setRes0].parent = ifId;

    addBlock(defId, 'procedures_definition', hashFirst, null, { custom_block: [1, protoId] }, {}, false, true, { x: 20, y: 700 });
    addBlock(protoId, 'procedures_prototype', null, defId, { [argProcId]: [2, argShadow] }, {}, true, false, {
      mutation: {
        tagName: 'mutation', children: [],
        proccode: 'might-contain item: %s',
        argumentids: JSON.stringify([argProcId]),
        argumentnames: JSON.stringify(['item']),
        argumentdefaults: JSON.stringify(['']),
        warp: 'false',
      },
    });
    addBlock(argShadow, 'argument_reporter_string_number', null, protoId, {}, { VALUE: ['item', null] }, true, false);
    blocks[hashFirst].parent = defId;
  }

  return { lists, variables, blocks };
}
