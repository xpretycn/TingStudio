$path = 'd:\Program Data\workspace-codebd\TingStudio\frontend\src\views\ai\AiWorkspace.vue'
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$lines = $content -split "`n"

# Define replacements as (lineNumber, newLine) pairs
$replacements = @{
    167 = $lines[166] -replace '前往操作 \?', '前往操作 →'
    303 = $lines[302] -replace '输入问题\?/ 调用指令', '输入问题，按 / 调用指令'
    1066 = $lines[1065] -replace "'内容已复\?\)", "'内容已复制')"
    1076 = $lines[1075] -replace "'内容已复\?\)", "'内容已复制')"
    1101 = $lines[1100] -replace "'消息已删\?\)", "'消息已删除')"
    1124 = $lines[1123] -replace "label: '业务员查\?,", "label: '业务员查询',"
    1190 = $lines[1189] -replace "详细属性、价格和供应\?,", "详细属性、价格和供应商',"
    1195 = $lines[1194] -replace "'属\?, 'material'", "'属性', 'material'"
    1201 = $lines[1200] -replace "库存状态、库存量及预警信\?,", "库存状态、库存量及预警信息',"
    1221 = $lines[1220] -replace "id: '查询业务\?,", "id: '查询业务员',"
    1222 = $lines[1221] -replace "label: '查询业务\?,", "label: '查询业务员',"
    1223 = $lines[1222] -replace "搜索业务员信\?,", "搜索业务员信息',"
    1227 = $lines[1226] -replace "prefix: '请帮我查询业务员\?,", "prefix: '请帮我查询业务员',"
    1228 = $lines[1227] -replace "'业务\?, '查询'", "'业务员', '查询'"
    1232 = $lines[1231] -replace "id: '业务员详\?,", "id: '业务员详情',"
    1233 = $lines[1232] -replace "label: '业务员详\?,", "label: '业务员详情',"
    1238 = $lines[1237] -replace "prefix: '请帮我查看业务员详情\?,", "prefix: '请帮我查看业务员详情',"
    1239 = $lines[1238] -replace "'业务\?, '详情'", "'业务员', '详情'"
    1243 = $lines[1242] -replace "id: '业务员业\?,", "id: '业务员业绩',"
    1244 = $lines[1243] -replace "label: '业务员业\?,", "label: '业务员业绩',"
    1245 = $lines[1244] -replace "业绩排名和完成\?,", "业绩排名和完成度',"
    1249 = $lines[1248] -replace "prefix: '请帮我查看业务员业绩\?,", "prefix: '请帮我查看业务员业绩',"
    1250 = $lines[1249] -replace "'业务\?, '业绩', '排名', '完成\?,", "'业务员', '业绩', '排名', '完成度',"
    1254 = $lines[1253] -replace "id: '销量分\?,", "id: '销量分析',"
    1255 = $lines[1254] -replace "label: '销量分\?,", "label: '销量分析',"
    1261 = $lines[1260] -replace "'销\?, '销\?, '趋势'", "'销量', '销售', '趋势'"
    1267 = $lines[1266] -replace "整体运营概\?,", "整体运营概况',"
    1283 = $lines[1282] -replace "'消\?, 'formula'", "'消耗', 'formula'"
    1300 = $lines[1299] -replace "报告和关键指标汇\?,", "报告和关键指标汇总',"
    1311 = $lines[1310] -replace "周度统计报告和环比变\?,", "周度统计报告和环比变化',"
    1959 = $lines[1958] -replace "'表格数据已复制到剪贴\?\)", "'表格数据已复制到剪贴板')"
    2035 = $lines[2034] -replace "target.includes\('销\?\)", "target.includes('销')"
    2087 = $lines[2086] -replace "分析这个配方的成本结\?,", "分析这个配方的成本结构',"
    2088 = $lines[2087] -replace "推荐相似的高销量配\?,", "推荐相似的高销量配方',"
    2089 = $lines[2088] -replace "检查原料库存是否充\?,", "检查原料库存是否充足',"
    2093 = $lines[2092] -replace "预测下月销量趋\?,", "预测下月销量趋势',"
    2094 = $lines[2093] -replace "生成本月销售报\?,", "生成本月销售报表',"
    2101 = $lines[2100] -replace "生成采购建议\?,", "生成采购建议方案',"
    2156 = $lines[2155] -replace "'身份设置已保\?\)", "'身份设置已保存')"
    2256 = $lines[2255] -replace "content: '操作已取消\?,", "content: '操作已取消',"
    2305 = $lines[2304] -replace "content: '表单已取消\?,", "content: '表单已取消',"
}

foreach ($lineNum in $replacements.Keys) {
    $lines[$lineNum - 1] = $replacements[$lineNum]
}

$newContent = $lines -join "`n"
[System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Done. Applied $($replacements.Count) replacements."
