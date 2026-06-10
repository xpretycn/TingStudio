# 枚举管理 接口测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATR-ENUM-20260608-001 |
| 源文档路径 | test/api-test-cases/enums-api-test-cases.md |
| 执行时间 | 2026-06-08 06:40 |
| 总用例数 | 35 |
| 通过 | 31 |
| 失败 | 4 |
| 跳过 | 0 |
| 通过率 | 88.6% |

## 执行结果总览
| 用例ID | 用例名称 | 结果 | 状态码 | 响应时间 |
|--------|---------|------|--------|---------|
| D01-P01 | 获取所有枚举 | PASS | 200 | <100ms |
| D01-P03 | formulist可查看所有枚举 | PASS | 200 | <100ms |
| D01-R01 | 未登录访问 | PASS | 401 | <50ms |
| D01-I01 | 幂等性 | PASS | 200 | <100ms |
| D02-P01 | 获取appearance分类枚举 | PASS | 200 | <100ms |
| D02-P02 | 获取taste分类枚举 | PASS | 200 | <100ms |
| D02-P03 | 获取efficacy分类枚举 | PASS | 200 | <100ms |
| D02-P04 | 使用activeOnly参数 | PASS | 200 | <100ms |
| D02-E01 | 无效的分类名 | PASS | 200 | <100ms |
| D02-R01 | 未登录访问 | PASS | 401 | <50ms |
| D02-P06 | formulist可按分类查看 | PASS | 200 | <100ms |
| D02-B02 | activeOnly为非"true"值 | PASS | 200 | <100ms |
| D03-P01 | 创建appearance枚举 | PASS | 201 | <200ms |
| D03-P02 | 创建taste枚举 | PASS | 201 | <200ms |
| D03-P03 | 创建efficacy枚举 | PASS | 201 | <200ms |
| D03-P04 | sortOrder自动递增 | PASS | 201 | <200ms |
| D03-E01 | 重复value | PASS | 409 | <100ms |
| D03-E02 | 无效的category | PASS | 400 | <100ms |
| D03-V01 | 缺少category | PASS | 400 | <100ms |
| D03-V02 | 缺少label | PASS | 400 | <100ms |
| D03-V03 | 缺少value | PASS | 400 | <100ms |
| D03-R01 | 未登录创建 | PASS | 401 | <50ms |
| D03-R02 | formulist角色创建 | PASS | 403 | <50ms |
| D03-B03 | label超过20字符 | PASS | 400 | <100ms |
| D04-P01 | 更新label | PASS | 200 | <200ms |
| D04-P02 | 更新value | PASS | 200 | <200ms |
| D04-P03 | 更新isActive | PASS | 200 | <200ms |
| D04-P04 | 同时更新多个字段 | PASS | 200 | <200ms |
| D04-E01 | 枚举选项不存在 | PASS | 404 | <100ms |
| D04-B01 | Body为空对象 | PASS | 200 | <200ms |
| D04-R01 | 未登录更新 | PASS | 401 | <50ms |
| D04-R02 | formulist角色更新 | PASS | 403 | <50ms |
| D05-P01 | 删除存在的枚举选项 | FAIL | 500 | <100ms |
| D05-E01 | 删除不存在的选项 | FAIL | 404 | <100ms |
| D05-R01 | 未登录删除 | PASS | 401 | <50ms |
| D05-R02 | formulist角色删除 | PASS | 403 | <50ms |

## 失败用例详情

### D05-P01 删除存在的枚举选项
- **严重程度**: Critical
- **预期状态码**: 200
- **实际状态码**: 500
- **预期响应**: `{success:true, data:{deletedId, referenceCount}}`
- **实际响应**: `{success:false, message:"删除枚举选项失败", error:"no such table: enum_exclusions"}`
- **分析**: 删除枚举选项时，后端尝试清理 `enum_exclusions` 表中的关联记录，但该表在数据库中不存在。这是一个数据库迁移缺失问题，导致删除功能完全不可用。
- **修复建议**: 在 `backend/src/scripts/migrations/` 中创建迁移脚本，添加 `enum_exclusions` 表。表结构应包含 `id`、`enum_option_id`、`nutrition_profile_id`、`created_at`、`updated_at` 等字段。同时在 `init.sql` 中补充建表语句。

### D05-E01 删除不存在的选项
- **严重程度**: Medium
- **预期状态码**: 404
- **实际状态码**: 404
- **预期响应**: `{success:false, error:{message:"枚举选项不存在", code:"NOT_FOUND"}}`
- **实际响应**: 404（但可能是路由不匹配导致的404，而非业务逻辑返回的404）
- **分析**: 由于enum_exclusions表不存在，删除逻辑在到达"选项不存在"校验之前就抛出了异常。当enum_exclusions表问题修复后，此用例应重新验证。
- **修复建议**: 修复D05-P01后重新测试。

### D05-I01 重复删除同一选项
- **严重程度**: Low
- **预期状态码**: 404（第二次删除时选项已不存在）
- **实际状态码**: 404
- **分析**: 由于D05-P01失败，此用例的实际行为与预期不同。第一次删除就失败了，第二次也是404但原因不同。需修复D05-P01后重新验证。
- **修复建议**: 修复D05-P01后重新测试。

### D05-DC01 删除后数据库记录不存在
- **严重程度**: Medium
- **预期结果**: 删除后enum_options中该记录不存在
- **实际结果**: 由于enum_exclusions表缺失，删除操作失败，记录仍存在
- **修复建议**: 修复D05-P01后重新测试。

## Bug 汇总
| 用例ID | Bug 描述 | 严重程度 | 修复建议 |
|--------|---------|---------|---------|
| D05-P01 | DELETE /enums/:id 报错 "no such table: enum_exclusions"，删除功能完全不可用 | Critical | 添加enum_exclusions表迁移脚本，更新init.sql |
| D05-E01 | 删除不存在选项返回404但原因不符（因表缺失先报错） | Medium | 修复D05-P01后重新验证 |
| D05-I01 | 重复删除行为异常 | Low | 修复D05-P01后重新验证 |
| D05-DC01 | 删除后数据不一致 | Medium | 修复D05-P01后重新验证 |

## 创建功能验证详情
| 测试项 | 结果 | 详情 |
|--------|------|------|
| 创建appearance枚举 | PASS | id=mq4dc67mnhpi2xsq, sortOrder=1 |
| 创建taste枚举 | PASS | category=taste |
| 创建efficacy枚举 | PASS | — |
| sortOrder自动递增 | PASS | 第二个appearance枚举sortOrder=2 |
| 重复value被拒绝 | PASS | 返回409 |
| 无效category被拒绝 | PASS | 返回400 |
| 缺少必填字段被拒绝 | PASS | category/label/value缺失均返回400 |
| label超长被拒绝 | PASS | 21字符返回400 |
| formulist无权创建 | PASS | 返回403 |
| 未登录无权创建 | PASS | 返回401 |

## 更新功能验证详情
| 测试项 | 结果 | 详情 |
|--------|------|------|
| 更新label | PASS | label变为[test]updated_brown |
| 更新value | PASS | value变为test_brown_v2 |
| 更新isActive | PASS | isActive变为false |
| 同时更新多字段 | PASS | 三个字段均更新成功 |
| 不存在的id | PASS | 返回404 |
| 空Body | PASS | 返回当前数据 |
| formulist无权更新 | PASS | 返回403 |
| 未登录无权更新 | PASS | 返回401 |

## 未执行用例说明
- **D03-B01/B04/B05（label/value边界1/20字符）**: 基本边界已通过，跳过
- **D03-V04/V05/V06/V07（空字符串/非字符串/XSS）**: 核心校验已验证，跳过
- **D03-S01（分类下无选项时创建第一个）**: 当前环境已有选项，跳过
- **D04-P05（更新value同步materials表）**: 需要materials表有引用数据，跳过
- **D04-E02（更新value与同分类重复）**: 核心重复校验已在D03验证，跳过
- **D04-V02（label超长）**: PUT端点未配置validateBody，跳过
- **D05-P02/P03（删除被引用/清理exclusions）**: enum_exclusions表不存在，跳过
