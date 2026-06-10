"""
Fix encoding corruption using byte-level matching.
The U+FFFD replacement char is bytes ef bf bd in UTF-8.
We need to find all ef bf bd sequences and fix the surrounding context.
"""
import re

filepath = r'd:\Program Data\workspace-codebd\TingStudio\frontend\src\views\ai\AiWorkspace.vue'

with open(filepath, 'rb') as f:
    data = f.read()

# Count occurrences of U+FFFD (ef bf bd)
count = data.count(b'\xef\xbf\xbd')
print(f'Found {count} U+FFFD replacement characters')

# Decode for line-by-line analysis
text = data.decode('utf-8', errors='replace')
lines = text.split('\n')

fixes = []
for i, line in enumerate(lines):
    lineno = i + 1
    if '\ufffd' not in line:
        continue
    
    original = line
    
    # === TEMPLATE FIXES ===
    
    # L303: placeholder="输入问题?/ 调用指令..."
    if 'placeholder' in line and '输入问题' in line:
        line = line.replace('输入问题\ufffd/ 调用指令', '输入问题，按 / 调用指令')
    
    # L434: <label>对您的称?/label>
    if '对您的称' in line:
        line = line.replace('对您的称\ufffd/label', '对您的称呼</label')
    
    # L441: 专业 · 简洁高?/option>
    if '简洁高' in line:
        line = line.replace('简洁高\ufffd/option', '简洁高效</option')
    
    # L448: 可?/span>
    line = line.replace('可\ufffd/span', '可选</span')
    
    # L453: 自定义指?<span
    line = line.replace('自定义指\ufffd<span', '自定义指令<span')
    
    # L455: 低成本方案?></textarea>
    line = line.replace('低成本方案\ufffd?></textarea>', '低成本方案"</textarea>')
    
    # L456: 遵循这些要?/span>
    line = line.replace('遵循这些要\ufffd/span', '遵循这些要求</span')
    
    # L462: 保存?...
    line = line.replace('保存\ufffd...', '保存中...')
    
    # L322: 加载模型?..
    line = line.replace('加载模型\ufffd..', '加载模型中...')
    
    # L167: 前往操作 ?
    line = line.replace('前往操作 \ufffd', '前往操作 →')
    
    # L54: '未命名会话?'
    line = line.replace("未命名会\ufffd'", "未命名会话'")
    line = line.replace("未命名会\ufffd? ", "未命名会话' ")
    
    # === JS FIXES ===
    
    # showActionToast
    line = line.replace("内容已复\ufffd);", "内容已复制');")
    line = line.replace("消息已删\ufffd);", "消息已删除');")
    line = line.replace("剪贴\ufffd);", "剪贴板');")
    
    # commandRegistry items - the pattern is: '查询业务?,' where ? breaks the string
    # Need to handle: id: '查询业务?,  -> id: '查询业务员',
    line = line.replace("查询业务\ufffd,", "查询业务员',")
    line = line.replace("业务员详\ufffd,", "业务员详情',")
    line = line.replace("业务员业\ufffd,", "业务员业绩',")
    line = line.replace("销量分\ufffd,", "销量分析',")
    line = line.replace("供应\ufffd,", "供应商',")
    line = line.replace("'属\ufffd,", "'属性',")
    line = line.replace("预警信\ufffd,", "预警信息',")
    line = line.replace("查询业务员\ufffd,", "查询业务员，',")
    line = line.replace("业务员详情\ufffd,", "业务员详情，',")
    line = line.replace("业务员业绩\ufffd,", "业务员业绩，',")
    line = line.replace("'业务\ufffd,", "'业务员',")
    line = line.replace("完成\ufffd,", "完成率',")
    line = line.replace("'销\ufffd,", "'销量',")
    line = line.replace("运营概\ufffd,", "运营概况',")
    line = line.replace("'消\ufffd,", "'消耗',")
    line = line.replace("指标汇\ufffd,", "指标汇总',")
    line = line.replace("业务员查\ufffd,", "业务员查询',")
    line = line.replace("本月销\ufffd,", "本月销量',")
    line = line.replace("待处理任\ufffd,", "待处理任务',")
    
    # Navigation map
    line = line.replace("'业务\ufffd?:", "'业务员':")
    line = line.replace("业务员管\ufffd }", "业务员管理' }")
    line = line.replace("'销\ufffd?:", "'销量':")
    line = line.replace("销售管\ufffd }", "销售管理' }")
    
    # Quick actions with emoji
    line = line.replace("销量趋\ufffd📈", "销量趋势📈")
    line = line.replace("库存不\ufffd🧪", "库存不足🧪")
    line = line.replace("原料需\ufffd🔮", "原料需求🔮")
    line = line.replace("成本结\ufffd💰", "成本结构💰")
    line = line.replace("销售报\ufffd📄", "销售报告📄")
    line = line.replace("成本结\ufffd,", "成本结构',")
    line = line.replace("高销量配\ufffd,", "高销量配方',")
    line = line.replace("是否充\ufffd,", "是否充足',")
    
    # Console/log
    line = line.replace("尝试重\ufffd..", "尝试重连...")
    
    # Regex patterns
    line = line.replace("检\ufffd库存", "检查库存")
    line = line.replace("业务\ufffd/g", "业务员)/g")
    line = line.replace("销\ufffd/g", "销量)/g")
    
    # Complex regex with ? - these need special handling
    # Pattern: ?([^】]+)? -> 【$1】
    # Byte pattern: ef bf bd 28 -> should be e3 80 90 28 (【()
    # Let's just replace the whole corrupted regex
    
    # includes
    line = line.replace("includes('销\ufffd?)", "includes('销量')")
    line = line.replace("includes('销\ufffd?))", "includes('销售'))")
    
    # Comments
    line = line.replace("最多显\ufffd个操作按\ufffd", "最多显示3个操作按钮")
    line = line.replace("调整推\ufffd", "调整推荐")
    line = line.replace("// \ufffdAI 响应中提取可操作的动\ufffd", "// 从AI响应中提取可操作的动作")
    line = line.replace("最近访\ufffd", "最近访问")
    line = line.replace("俏皮\ufffd", "俏皮语")
    line = line.replace("智能填\ufffd导入组件\ufffd", "智能填单/导入组件）")
    line = line.replace("发送消\ufffd", "发送消息")
    line = line.replace("按需启用\ufffd", "按需启用）")
    line = line.replace("搜\ufffd输入处理", "搜索输入处理")
    line = line.replace("切换状\ufffd", "切换状态")
    line = line.replace("导入\ufffd", "导入）")
    line = line.replace("状态定\ufffd", "状态定义")
    line = line.replace("AI俏皮\ufffd", "AI俏皮语")
    line = line.replace("全局错误状\ufffd", "全局错误状态")
    line = line.replace("AI对话状\ufffd", "AI对话状态")
    
    # FALLBACK_POOL
    line = line.replace("加油\ufffd?💪", "加油💪")
    line = line.replace("喝\ufffd?🥤", "喝水🥤")
    line = line.replace("工\ufffd?小时", "工作2小时")
    line = line.replace("活动一\ufffd?🏃", "活动一下🏃")
    line = line.replace("任\ufffd?🎯", "任务🎯")
    line = line.replace("准时\ufffd?\ufffd,", "准时呢⏰\",")
    
    # Template comments
    line = line.replace("══\ufffd?", "═══")
    line = line.replace("区\ufffd?", "区域")
    line = line.replace("核心\ufffd?", "核心）")
    line = line.replace("侧边\ufffd?", "侧边栏")
    line = line.replace("右移\ufffd?", "右移）")
    line = line.replace("指示\ufffd?", "指示器")
    line = line.replace("输入框区\ufffd?", "输入框区域")
    
    # Generic: ?/tag -> </tag (for any remaining ?/ patterns)
    line = re.sub(r'\ufffd/((?:label|option|span|li|p|div|td|th|h[1-6]))', r'</\1', line)
    
    if line != original:
        fixes.append((lineno, original.strip()[:80], line.strip()[:80]))
        lines[i] = line

result = '\n'.join(lines)
with open(filepath, 'wb') as f:
    f.write(result.encode('utf-8'))

print(f'Fixed {len(fixes)} lines:')
for lineno, old, new in fixes:
    print(f'  L{lineno}:')
    print(f'    OLD: {old}')
    print(f'    NEW: {new}')
