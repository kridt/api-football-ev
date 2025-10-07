const KEY = "fav-leagues-v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const favorites = {
  getAll() {
    return read();
  },
  has(id) {
    return read().includes(Number(id));
  },
  add(id) {
    const set = new Set(read());
    set.add(Number(id));
    localStorage.setItem(KEY, JSON.stringify([...set]));
  },
  remove(id) {
    const set = new Set(read());
    set.delete(Number(id));
    localStorage.setItem(KEY, JSON.stringify([...set]));
  },
  toggle(id) {
    this.has(id) ? this.remove(id) : this.add(id);
  },
};
