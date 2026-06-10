/**
 * 测试脚本 - 验证数据生成是否正确
 */

const { exec } = require('child_process');

console.log('开始测试数据初始化...\n');

exec('node --loader tsx scripts/initSampleData.ts', (error, stdout, stderr) => {
  if (error) {
    console.error('执行错误:', error);
    return;
  }
  if (stderr) {
    console.error('错误输出:', stderr);
    return;
  }
  console.log('输出结果:', stdout || '(无输出)');
  console.log('\n测试完成');
});
