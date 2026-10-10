const Busboy = require('busboy');
const MAX_FILE_BYTES = 5 * 1024 * 1024;
function problem(status, code) { return Object.assign(new Error(code), { status, code }); }

// Only bounded buffers are retained; rejected parts are drained by Busboy.
function readLicense(req) {
  return new Promise((resolve, reject) => {
    let parser;
    try {
      parser = Busboy({ headers: req.headers, limits: {
        fileSize: MAX_FILE_BYTES + 1, files: 1, fields: 0, parts: 2, headerPairs: 100,
      } });
    } catch { reject(problem(400, 'INVALID_MULTIPART')); return; }
    let failure, file, size = 0, total = 0;
    const chunks = [];
    const fail = (status, code) => { failure ||= problem(status, code); };
    const onData = chunk => {
      total += chunk.length;
      if (total > MAX_FILE_BYTES + 64 * 1024) {
        fail(413, 'FILE_TOO_LARGE');
        req.unpipe(parser);
        parser.destroy(failure);
        req.resume();
      }
    };
    const onAborted = () => parser.destroy(problem(400, 'UPLOAD_ABORTED'));
    const timer = setTimeout(() => {
      req.unpipe(parser);
      parser.destroy(problem(408, 'UPLOAD_TIMEOUT'));
      req.resume();
    }, 30_000);
    timer.unref();
    const clean = () => {
      clearTimeout(timer);
      req.removeListener('data', onData);
      req.removeListener('aborted', onAborted);
    };
    parser.on('file', (field, stream, info) => {
      if (field !== 'license' || file) fail(400, 'ONE_LICENSE_REQUIRED');
      file = info;
      stream.on('limit', () => fail(413, 'FILE_TOO_LARGE'));
      stream.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_FILE_BYTES) fail(413, 'FILE_TOO_LARGE');
        if (!failure) chunks.push(chunk);
      });
      stream.on('error', () => fail(400, 'INVALID_MULTIPART'));
    });
    parser.on('field', () => fail(400, 'UNEXPECTED_FIELD'));
    parser.on('fieldsLimit', () => fail(400, 'UNEXPECTED_FIELD'));
    parser.on('filesLimit', () => fail(400, 'ONE_LICENSE_REQUIRED'));
    parser.on('partsLimit', () => fail(400, 'ONE_LICENSE_REQUIRED'));
    parser.on('error', error => { clean(); reject(error.status ? error : problem(400, 'INVALID_MULTIPART')); });
    parser.on('close', () => {
      clean();
      if (failure) reject(failure);
      else if (!file || !size) reject(problem(400, 'ONE_LICENSE_REQUIRED'));
      else resolve({ buffer: Buffer.concat(chunks), ...file });
    });
    req.on('data', onData);
    req.on('aborted', onAborted);
    req.pipe(parser);
  });
}

async function validateFile(file) {
  const { fileTypeFromBuffer } = await import('file-type');
  let type;
  try { type = await fileTypeFromBuffer(file.buffer); } catch { /* malformed */ }
  const allowed = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg' };
  const suffix = /\.([a-z0-9]+)$/i.exec(file.filename || '')?.[1]?.toLowerCase();
  if (!type || allowed[type.ext] !== type.mime || file.mimeType !== type.mime ||
      !(suffix === type.ext || (type.ext === 'jpg' && suffix === 'jpeg'))) {
    throw problem(415, 'INVALID_FILE_TYPE');
  }
  // Basic truncation checks. These are not an antivirus or full document decoder.
  const b = file.buffer;
  const complete = type.ext === 'pdf' ? /%%EOF\s*$/.test(b.subarray(-1024).toString('latin1')) :
    type.ext === 'jpg' ? b.subarray(-2).equals(Buffer.from([0xff, 0xd9])) :
    b.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'));
  if (!complete) throw problem(415, 'INVALID_FILE_TYPE');
  return type;
}
module.exports = { readLicense, validateFile, problem, MAX_FILE_BYTES };
