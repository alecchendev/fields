// Reader for the VRML 1.0 node subset used by the twelve original models.
// Separator saves/restores state; materials and coordinates affect following siblings.
export function parseVRML(text) {
  if (!text.startsWith('#VRML V1.0 ascii')) throw new Error('Expected VRML 1.0 ASCII');
  const tokens = text.replace(/#[^\n]*/g, '').match(/[A-Za-z_][\w]*|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[{}\[\]]/g);
  let cursor = 0;
  const nodes = () => {
    const result = [];
    while (cursor < tokens.length && tokens[cursor] !== '}') {
      const type = tokens[cursor++];
      if (tokens[cursor++] !== '{') throw new Error(`Expected node: ${type}`);
      const node = {type, fields: {}, children: []};
      while (tokens[cursor] !== '}') {
        if (cursor >= tokens.length) throw new Error('Unclosed node');
        if (tokens[cursor + 1] === '{') { node.children.push(...nodes()); break; }
        const field = tokens[cursor++];
        if (tokens[cursor] === '[') {
          cursor++; const values = [];
          while (tokens[cursor] !== ']') {
            if (cursor >= tokens.length) throw new Error('Unclosed array');
            values.push(Number(tokens[cursor++]));
          }
          cursor++; node.fields[field] = values;
        } else node.fields[field] = tokens[cursor++];
      }
      cursor++; result.push(node);
    }
    return result;
  };
  const roots = nodes();
  const positions = [], colors = [];
  let faceCount = 0;
  function visit(list, inherited = {}) {
    const state = {...inherited};
    for (const node of list) {
      if (node.type === 'Separator') visit(node.children, state);
      else if (node.type === 'MaterialBinding') {
        if (node.fields.value !== 'PER_FACE_INDEXED') throw new Error('Unsupported material binding');
      } else if (node.type === 'Coordinate3') state.points = node.fields.point;
      else if (node.type === 'Material') state.material = node.fields.diffuseColor;
      else if (node.type === 'IndexedFaceSet') {
        const {coordIndex, materialIndex} = node.fields;
        if (!state.points || !state.material || !coordIndex) throw new Error('Missing mesh data');
        let face = [], faceIndex = 0;
        for (const index of coordIndex) {
          if (index !== -1) { face.push(index); continue; }
          if (face.length < 3) throw new Error('Invalid face');
          const material = materialIndex?.[faceIndex] ?? 0;
          const color = state.material.slice(material * 3, material * 3 + 3);
          if (color.length !== 3 || color.some(c => !Number.isFinite(c))) throw new Error('Invalid material index');
          for (let i = 1; i < face.length - 1; i++) {
            for (const vertex of [face[0], face[i], face[i + 1]]) {
              if (!Number.isInteger(vertex) || vertex < 0 || vertex * 3 + 2 >= state.points.length) throw new Error('Invalid vertex index');
              positions.push(...state.points.slice(vertex * 3, vertex * 3 + 3));
              colors.push(...color);
            }
          }
          faceIndex++; faceCount++; face = [];
        }
        if (face.length) throw new Error('Unterminated face');
      } else throw new Error(`Unsupported node ${node.type}`);
    }
  }
  visit(roots);
  if (!positions.length || positions.some(n => !Number.isFinite(n))) throw new Error('Empty or invalid geometry');
  return {positions: new Float32Array(positions), colors: new Float32Array(colors), faceCount};
}
