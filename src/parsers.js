export const tokenizer = ({ tokens, unmatchedToken = 'unmatched', onMismatch }) => {
const parsersStack = [];
  const tc = initializeParsers(tokens);
  return (s) => {
    let token;
    let m, r, t;
    return {
      parsers: {
        push (p) {
          parsersStack.push(tc);
          tc = p;
        },
        pop () {
          tc = parsersStack.pop();
        },
        get current () {
          return tc;
        }
      },
      read: () => {
        if (s) {
          t = null;
          m = s.length;
          for (const parser of tc.members) {
            if (m) {
              r = parser.pattern.exec(s);
              // try to choose the best match if there are several
              // where "best" is the closest to the current starting point
              if (r && (r.index < m)) {
                const value = r[0];
                t = {
                  value,
                  type: parser,
                  matches: r.slice(1)
                }
                m = r.index;
              }
            }
          }
          if (m) {
            // there is text between last token and currently
            // matched token - push that out as default or "unknown"
            const value = s.substr(0, m);
            const node = {
              value,
              type: {
                name: unmatchedToken,
                handler: onMismatch || defaultTokenHandler
              }
            };
            onMismatch && onMismatch(node);
            token = node;
          }
          if (t) {
            // push current token onto sequence
            token = t;
          }
          s = s.substr(m + (t ? t.value.length : 0));
          return token;
        }
      }
    }
  }
}
