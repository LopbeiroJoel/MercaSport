const fs = require('node:fs/promises');
const path = require('node:path');

function createPrivateDiskStorage(directory) {
  if (process.env.VERCEL) throw new Error('Use durable private object storage on Vercel.');
  if (!directory || !path.isAbsolute(directory)) throw new Error('An absolute private directory is required.');
  const root = path.resolve(directory);
  const repository = path.resolve(__dirname, '../..');
  const relative = path.relative(repository, root);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Store documents outside the repository and web root.');
  }
  const location = key => {
    if (!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(key)) throw new Error('Invalid document key.');
    return path.join(root, key);
  };
  return {
    private: true,
    async put({ key, buffer }) {
      await fs.mkdir(root, { recursive: true, mode: 0o700 });
      const target = location(key);
      let handle;
      try {
        handle = await fs.open(target, 'wx', 0o600);
        await handle.writeFile(buffer);
        await handle.sync();
      } catch (error) {
        if (handle) await fs.unlink(target).catch(() => {});
        throw error;
      } finally { await handle?.close(); }
    },
    async remove(key) { await fs.unlink(location(key)); },
  };
}
module.exports = { createPrivateDiskStorage };
