// Local development storage: JSON documents + uploads on disk.
// Writes are atomic (temp file + rename) and serialised, so a crash never leaves half-written content.
import fs from 'node:fs/promises';
import path from 'node:path';

export class ConflictError extends Error {}

export function createFileStore(dataDir) {
  const kvDir = path.join(dataDir, 'kv');
  const sessFile = path.join(dataDir, 'sessions.json');
  const upDir = path.join(dataDir, 'uploads');
  const msgDir = path.join(dataDir, 'messages');
  const privDir = path.join(dataDir, 'private'); // files never served directly (product PDFs)
  const recDir = path.join(dataDir, 'records'); // leads and other records, one file each
  let chain = Promise.resolve();
  const lock = (fn) => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };

  const ready = Promise.all([kvDir, upDir, msgDir, privDir, recDir].map((d) => fs.mkdir(d, { recursive: true })));
  const safe = (s) => String(s).replace(/[^a-z0-9._-]/gi, '');
  const recFile = (col, id) => path.join(recDir, safe(col), `${safe(id)}.json`);
  const msgFile = (id) => path.join(msgDir, `${String(id).replace(/[^a-f0-9-]/gi, '')}.json`);
  async function allMessages() {
    await ready;
    const names = (await fs.readdir(msgDir)).filter((n) => n.endsWith('.json'));
    const items = [];
    for (const n of names) {
      const m = await readJson(path.join(msgDir, n), null);
      if (m) items.push(m);
    }
    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const file = (key) => path.join(kvDir, `${key.replace(/[^a-z0-9_-]/gi, '')}.json`);
  async function readJson(f, fallback) {
    try {
      return JSON.parse(await fs.readFile(f, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return fallback;
      throw e;
    }
  }
  async function writeAtomic(f, obj) {
    const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(obj));
    await fs.rename(tmp, f);
  }

  return {
    name: 'file',
    persistent: false,

    async getKV(key) {
      await ready;
      return readJson(file(key), null);
    },
    /** expectedVersion 0 = create; otherwise update only if the stored version matches. */
    putKV(key, value, expectedVersion) {
      return lock(async () => {
        await ready;
        const cur = await readJson(file(key), null);
        const curVersion = cur ? cur.version : 0;
        if (curVersion !== expectedVersion) throw new ConflictError('version mismatch');
        const next = { value, version: curVersion + 1, updatedAt: new Date().toISOString() };
        await writeAtomic(file(key), next);
        return { version: next.version, updatedAt: next.updatedAt };
      });
    },

    createSession: (idHash, expiresAt) =>
      lock(async () => {
        const all = await readJson(sessFile, {});
        const now = Date.now();
        for (const [k, v] of Object.entries(all)) if (v < now) delete all[k];
        all[idHash] = expiresAt;
        await writeAtomic(sessFile, all);
      }),
    async getSession(idHash) {
      const all = await readJson(sessFile, {});
      return all[idHash] || null;
    },
    deleteSession: (idHash) =>
      lock(async () => {
        const all = await readJson(sessFile, {});
        delete all[idHash];
        await writeAtomic(sessFile, all);
      }),

    // ── media ──
    async putObject(name, buffer) {
      await ready;
      const f = path.join(upDir, name);
      await fs.writeFile(f, buffer, { flag: 'w' });
      return { url: `/uploads/${name}`, path: name };
    },
    async deleteObject(name) {
      await fs.rm(path.join(upDir, path.basename(name)), { force: true });
    },
    uploadsDir: upDir,

    // ── private files ──
    async putPrivate(name, buffer) {
      await ready;
      await fs.writeFile(path.join(privDir, safe(name)), buffer);
    },
    async getPrivate(name) {
      try {
        return await fs.readFile(path.join(privDir, safe(name)));
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
      }
    },
    async hasPrivate(name) {
      try {
        await fs.access(path.join(privDir, safe(name)));
        return true;
      } catch {
        return false;
      }
    },
    async deletePrivate(name) {
      await fs.rm(path.join(privDir, safe(name)), { force: true });
    },

    // ── records (leads…) ──
    async addRecord(col, rec) {
      await ready;
      await fs.mkdir(path.join(recDir, safe(col)), { recursive: true });
      await writeAtomic(recFile(col, rec.id), rec);
    },
    async listRecords(col) {
      await ready;
      let names = [];
      try {
        names = (await fs.readdir(path.join(recDir, safe(col)))).filter((n) => n.endsWith('.json'));
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      const items = [];
      for (const n of names) {
        const r = await readJson(path.join(recDir, safe(col), n), null);
        if (r) items.push(r);
      }
      return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    getRecord: (col, id) => readJson(recFile(col, id), null),
    updateRecord: (col, id, patch) =>
      lock(async () => {
        const cur = await readJson(recFile(col, id), null);
        if (!cur) return null;
        const next = { ...cur, ...patch };
        await writeAtomic(recFile(col, id), next);
        return next;
      }),
    deleteRecord: (col, id) =>
      lock(async () => {
        try {
          await fs.unlink(recFile(col, id));
          return true;
        } catch (e) {
          if (e.code === 'ENOENT') return false;
          throw e;
        }
      }),

    // ── contact messages (one file per message) ──
    async addMessage(msg) {
      await ready;
      await writeAtomic(msgFile(msg.id), msg);
    },
    listMessages: allMessages,
    async countUnreadMessages() {
      return (await allMessages()).filter((m) => !m.read).length;
    },
    async hasAtLeastMessages(n) {
      await ready;
      return (await fs.readdir(msgDir)).filter((x) => x.endsWith('.json')).length >= n;
    },
    updateMessage: (id, patch) =>
      lock(async () => {
        const cur = await readJson(msgFile(id), null);
        if (!cur) return null;
        const next = { ...cur, ...patch };
        await writeAtomic(msgFile(id), next);
        return next;
      }),
    deleteMessage: (id) =>
      lock(async () => {
        try {
          await fs.unlink(msgFile(id));
          return true;
        } catch (e) {
          if (e.code === 'ENOENT') return false;
          throw e;
        }
      }),
  };
}
