export function assertBrowserResults(text) {
  const lines = text.trim().split('\n');
  if (lines.some(line => line.startsWith('FAIL '))) throw new Error(text);
  if (lines.filter(line => line.startsWith('PASS ')).length !== 8 ||
      lines.at(-1) !== 'ALL PASS (8 browser transaction tests)') {
    throw new Error('Incomplete browser test run:\n' + text);
  }
}
