// 将用户 id（后端为 UUID）转换为简短的数字 UID，用于界面展示（如 @42）
// 同一 id 永远得到同一数字，保证确定性
export function shortUid(id) {
  if (id === undefined || id === null || id === '') return '?';
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h) % 1000000);
}
