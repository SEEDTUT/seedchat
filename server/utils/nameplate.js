// 铭牌相关工具函数
// 统一处理 active_nameplate 嵌套对象的构建，供所有路由复用

// 在 SQL 中需要额外选取的铭牌字段（配合 LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id 使用）
// 别名固定为 nameplate_text / nameplate_bg_color / nameplate_text_color
export const NAMEPLATE_SELECT_FIELDS = `
  np.text AS nameplate_text,
  np.bg_color AS nameplate_bg_color,
  np.text_color AS nameplate_text_color
`;

// 标准 LEFT JOIN 子句，将 users.active_nameplate_id 关联到 nameplates 表
// 别名 np 与 NAMEPLATE_SELECT_FIELDS 中的别名保持一致
export const NAMEPLATE_JOIN = `LEFT JOIN seedchat_nameplates np ON u.active_nameplate_id = np.id`;

// 从扁平的查询结果行构建 active_nameplate 嵌套对象
// 若 row.nameplate_text 存在则返回 { text, bg_color, text_color }，否则返回 null
// 会删除扁平字段以保持返回结构干净（可选）
export function buildActiveNameplate(row, { keepFlat = false } = {}) {
  if (!row) return null;
  if (row.nameplate_text) {
    const nameplate = {
      text: row.nameplate_text,
      bg_color: row.nameplate_bg_color,
      text_color: row.nameplate_text_color,
    };
    if (!keepFlat) {
      delete row.nameplate_text;
      delete row.nameplate_bg_color;
      delete row.nameplate_text_color;
    }
    return nameplate;
  }
  // 即使没有铭牌也清理可能存在的 null 扁平字段
  if (!keepFlat) {
    delete row.nameplate_text;
    delete row.nameplate_bg_color;
    delete row.nameplate_text_color;
  }
  return null;
}

// 为单个对象（原地修改）附加 active_nameplate 字段，并返回该对象
export function withActiveNameplate(obj, options) {
  if (!obj) return obj;
  obj.active_nameplate = buildActiveNameplate(obj, options);
  return obj;
}

// 为数组中的每个对象附加 active_nameplate 字段，并返回该数组
export function withActiveNameplateArray(arr, options) {
  if (!Array.isArray(arr)) return arr;
  for (const item of arr) {
    withActiveNameplate(item, options);
  }
  return arr;
}
