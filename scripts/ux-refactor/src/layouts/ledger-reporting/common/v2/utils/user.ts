/** 当前操作人（审核人/编辑人等留痕字段用）。
 * 作品集演示版：固定虚构用户（真实系统取登录态 realName，兜底 username）。 */
export function currentUser(): string {
  return '地调演示员';
}
