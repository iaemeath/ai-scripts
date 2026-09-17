import dayjs from 'dayjs';

/** 统一时间格式化（全模块唯一实现）：兼容 ISO UTC 与 'yyyy-MM-dd HH:mm:ss' 两种入参，
 * 统一本地化显示，空值显示 '-'。修复各页三套实现并存导致的时区显示隐患。 */
export function fmtTime(t: any): string {
  if (!t) return '-';
  return dayjs(t).format('YYYY-MM-DD HH:mm:ss');
}
