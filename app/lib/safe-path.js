'use strict';

const fsp = require('node:fs').promises;
const path = require('node:path');

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

// Resolve both paths through the filesystem so a symlink inside the upload
// directory cannot redirect a resume read/delete outside the configured root.
async function resolveExistingFileWithin(root, storedPath) {
  if (
    typeof storedPath !== 'string'
    || storedPath.length < 1
    || storedPath.includes('\0')
    || path.isAbsolute(storedPath)
  ) {
    return null;
  }
  const lexicalRoot = path.resolve(root);
  const lexicalTarget = path.resolve(lexicalRoot, storedPath);
  if (!isContained(lexicalRoot, lexicalTarget)) {
    return null;
  }
  try {
    const [ canonicalRoot, canonicalTarget ] = await Promise.all([
      fsp.realpath(lexicalRoot),
      fsp.realpath(lexicalTarget),
    ]);
    return isContained(canonicalRoot, canonicalTarget)
      ? canonicalTarget
      : null;
  } catch {
    return null;
  }
}

module.exports = {
  isContained,
  resolveExistingFileWithin,
};
