export function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function load(key, fallback = null) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}
