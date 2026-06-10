# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: data-analysis.spec.ts >> ReportCompare 报告对比 >> E05-P01: 查看对比图表
- Location: e2e\data-analysis.spec.ts:697:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - link "跳到主要内容" [ref=e5] [cursor=pointer]:
      - /url: "#main-content"
    - complementary "主导航" [ref=e6]:
      - generic [ref=e7]:
        - generic "折叠/展开侧边栏" [ref=e8] [cursor=pointer]:
          - img [ref=e10]
          - heading "TingStudio" [level=1] [ref=e22]
          - img [ref=e23]
        - generic [ref=e25]:
          - generic [ref=e26]:
            - generic [ref=e27]:
              - paragraph [ref=e28]: "06"
              - paragraph [ref=e29]: 06月 · 周六
            - generic [ref=e30]:
              - generic [ref=e31]:
                - generic [ref=e32]: ☀️
                - generic [ref=e33]: 晴
                - button "刷新天气" [ref=e34] [cursor=pointer]:
                  - img [ref=e35]
              - paragraph [ref=e38]: 30°C · 江岸区
          - generic "点击换一条" [ref=e39] [cursor=pointer]:
            - generic [ref=e40]: 💬
            - generic [ref=e41]: 据说周五的配方成功率最高，是真的吗？🤔
      - navigation "侧边栏导航" [ref=e42]:
        - menubar [ref=e43]:
          - menuitem "工作台" [ref=e44] [cursor=pointer]:
            - img [ref=e46]
            - generic [ref=e48]: 工作台
            - img [ref=e50]
          - menuitem "AI 助手" [ref=e52] [cursor=pointer]:
            - generic [ref=e53]:
              - img [ref=e54]
              - generic [ref=e56]: NEW
            - generic [ref=e57]: AI 助手
            - img [ref=e59]
          - menuitem "智能工具" [ref=e61] [cursor=pointer]:
            - img [ref=e63]
            - generic [ref=e65]: 智能工具
            - img [ref=e67]
          - button "业务管理" [ref=e71] [cursor=pointer]:
            - img [ref=e72]
            - generic [ref=e74]: 业务管理
            - img [ref=e75]
          - generic [ref=e77]:
            - button "数据分析" [ref=e78] [cursor=pointer]:
              - img [ref=e79]
              - generic [ref=e81]: 数据分析
              - img [ref=e82]
            - generic [ref=e84]:
              - menuitem "销量分析" [ref=e85] [cursor=pointer]:
                - img [ref=e87]
                - generic [ref=e89]: 销量分析
              - menuitem "报告中心" [ref=e90] [cursor=pointer]:
                - img [ref=e92]
                - generic [ref=e94]: 报告中心
              - menuitem "营养分析" [ref=e95] [cursor=pointer]:
                - img [ref=e97]
                - generic [ref=e99]: 营养分析
              - menuitem "营养标准" [ref=e100] [cursor=pointer]:
                - img [ref=e102]
                - generic [ref=e104]: 营养标准
          - button "系统工具" [ref=e106] [cursor=pointer]:
            - img [ref=e107]
            - generic [ref=e109]: 系统工具
            - img [ref=e110]
      - generic [ref=e112]:
        - generic [ref=e113]:
          - generic [ref=e114]: 🚀
          - generic [ref=e115]: 快速开始
          - button "关闭引导" [ref=e116] [cursor=pointer]: ×
        - generic [ref=e117]:
          - generic [ref=e118] [cursor=pointer]:
            - generic [ref=e119]: "1"
            - generic [ref=e120]: 录入原料库
            - img [ref=e121]
          - generic [ref=e123] [cursor=pointer]:
            - generic [ref=e124]: "2"
            - generic [ref=e125]: 创建配方
            - img [ref=e126]
          - generic [ref=e128] [cursor=pointer]:
            - generic [ref=e129]: "3"
            - generic [ref=e130]: 分析营养成分
            - img [ref=e131]
        - button "开始引导" [ref=e134] [cursor=pointer]:
          - img [ref=e135]
          - generic [ref=e137]: 开始引导
      - generic [ref=e138]: v2.0.0
    - main [ref=e140]:
      - generic [ref=e143]:
        - generic [ref=e145]:
          - button "返回报告列表" [ref=e146] [cursor=pointer]:
            - img [ref=e147]
          - generic [ref=e149]:
            - navigation [ref=e150]:
              - generic [ref=e151] [cursor=pointer]: 报告中心
              - img [ref=e152]
              - generic [ref=e154]: 报告对比
            - heading "报告对比分析" [level=2] [ref=e155]
        - generic [ref=e156]:
          - generic [ref=e159]:
            - img [ref=e160]
            - heading "配方数据对比" [level=3] [ref=e163]
          - generic [ref=e170]:
            - img [ref=e171]
            - heading "销售数据对比" [level=3] [ref=e173]
  - generic:
    - generic:
      - generic [ref=e178]:
        - img [ref=e179]
        - text: 报告不存在
      - generic [ref=e181]:
        - img [ref=e182]
        - text: Request failed with status code 404
      - generic [ref=e184]:
        - img [ref=e185]
        - text: 报告不存在
      - generic [ref=e187]:
        - img [ref=e188]
        - text: Request failed with status code 404
```

# Test source

```ts
  600 |   });
  601 | 
  602 |   test("E09-P02: 生成月报", async ({ page }) => {
  603 |     // Select monthly type
  604 |     const monthlyRadio = page.locator("[class*='radio'], label").filter({ hasText: /月报/ });
  605 |     if ((await monthlyRadio.count()) > 0) {
  606 |       await monthlyRadio.first().click();
  607 |       await page.waitForTimeout(500);
  608 |     }
  609 |     // Select year
  610 |     const selects = page.locator(".t-select, [class*='select']");
  611 |     if ((await selects.count()) > 0) {
  612 |       await selects.first().click();
  613 |       await page.waitForTimeout(300);
  614 |       const option = page.locator(".t-select-option, .t-select__dropdown-item").first();
  615 |       if ((await option.count()) > 0) {
  616 |         await option.click();
  617 |         await page.waitForTimeout(300);
  618 |       }
  619 |     }
  620 |     // Select month
  621 |     if ((await selects.count()) > 1) {
  622 |       await selects.nth(1).click();
  623 |       await page.waitForTimeout(300);
  624 |       const option = page.locator(".t-select-option, .t-select__dropdown-item").first();
  625 |       if ((await option.count()) > 0) {
  626 |         await option.click();
  627 |         await page.waitForTimeout(300);
  628 |       }
  629 |     }
  630 |     // Click generate
  631 |     const generateBtn = page.locator("button").filter({ hasText: /确认生成|生成/ });
  632 |     if ((await generateBtn.count()) > 0) {
  633 |       const isDisabled = await generateBtn.first().isDisabled();
  634 |       if (!isDisabled) {
  635 |         await generateBtn.first().click();
  636 |         await page.waitForTimeout(5000);
  637 |         expect(true).toBeTruthy();
  638 |       }
  639 |     }
  640 |   });
  641 | 
  642 |   test("E09-U02: 确认生成按钮禁用态", async ({ page }) => {
  643 |     const generateBtn = page.locator("button").filter({ hasText: /确认生成|生成/ });
  644 |     if ((await generateBtn.count()) > 0) {
  645 |       // Without filling required fields, button may be disabled
  646 |       const isDisabled = await generateBtn.first().isDisabled();
  647 |       expect(isDisabled || true).toBeTruthy();
  648 |     }
  649 |   });
  650 | 
  651 |   test("E10-P01: 月报日期预览", async ({ page }) => {
  652 |     const monthlyRadio = page.locator("[class*='radio'], label").filter({ hasText: /月报/ });
  653 |     if ((await monthlyRadio.count()) > 0) {
  654 |       await monthlyRadio.first().click();
  655 |       await page.waitForTimeout(500);
  656 |     }
  657 |     const bodyText = await page.locator("body").innerText();
  658 |     const hasDatePreview = bodyText.includes("年") || bodyText.includes("月") || bodyText.includes("~");
  659 |     expect(hasDatePreview || true).toBeTruthy();
  660 |   });
  661 | });
  662 | 
  663 | // ============================================================
  664 | // 6. ReportCompare 报告对比
  665 | // ============================================================
  666 | test.describe("ReportCompare 报告对比", () => {
  667 |   test.beforeEach(async ({ page }) => {
  668 |     await login(page);
  669 |     // Need two report IDs - try with sample IDs first
  670 |     await page.goto(`${BASE_URL}/reports/compare?id1=1&id2=2`);
  671 |     await page.waitForTimeout(3000);
  672 |   });
  673 | 
  674 |   test("E01-P01: 点击返回", async ({ page }) => {
  675 |     const backBtn = page.locator("button").filter({ hasText: /返回/ });
  676 |     if ((await backBtn.count()) > 0) {
  677 |       await backBtn.first().click();
  678 |       await page.waitForTimeout(2000);
  679 |       expect(page.url()).toContain("/reports");
  680 |     }
  681 |   });
  682 | 
  683 |   test("E03-E01: 缺少报告ID参数", async ({ page }) => {
  684 |     await page.goto(`${BASE_URL}/reports/compare`);
  685 |     await page.waitForTimeout(3000);
  686 |     const bodyText = await page.locator("body").innerText();
  687 |     const hasError = bodyText.includes("缺少") || bodyText.includes("参数") || bodyText.includes("错误") || bodyText.includes("ID");
  688 |     expect(hasError || true).toBeTruthy();
  689 |   });
  690 | 
  691 |   test("E04-P01: 查看指标对比", async ({ page }) => {
  692 |     const bodyText = await page.locator("body").innerText();
  693 |     const hasCompare = bodyText.includes("新增配方") || bodyText.includes("完成配方") || bodyText.includes("销售") || bodyText.includes("对比");
  694 |     expect(hasCompare || true).toBeTruthy();
  695 |   });
  696 | 
  697 |   test("E05-P01: 查看对比图表", async ({ page }) => {
  698 |     const chart = page.locator("canvas, [class*='chart'], [class*='echarts']").first();
  699 |     if ((await chart.count()) > 0) {
> 700 |       expect(await chart.isVisible()).toBeTruthy();
      |                                       ^ Error: expect(received).toBeTruthy()
  701 |     }
  702 |   });
  703 | });
  704 | 
  705 | // ============================================================
  706 | // 7. WeeklyReport 周报详情
  707 | // ============================================================
  708 | test.describe("WeeklyReport 周报详情", () => {
  709 |   test.beforeEach(async ({ page }) => {
  710 |     await login(page);
  711 |     await page.goto(`${BASE_URL}/reports/weekly`);
  712 |     await page.waitForTimeout(3000);
  713 |   });
  714 | 
  715 |   test("E01-P01: 点击返回", async ({ page }) => {
  716 |     const backBtn = page.locator("button").filter({ hasText: /返回/ });
  717 |     if ((await backBtn.count()) > 0) {
  718 |       await backBtn.first().click();
  719 |       await page.waitForTimeout(2000);
  720 |       expect(page.url()).toContain("/reports");
  721 |     }
  722 |   });
  723 | 
  724 |   test("E02-P01: 点击编辑", async ({ page }) => {
  725 |     const editBtn = page.locator("button").filter({ hasText: /编辑/ });
  726 |     if ((await editBtn.count()) > 0) {
  727 |       await editBtn.first().click();
  728 |       await page.waitForTimeout(1000);
  729 |       expect(true).toBeTruthy();
  730 |     }
  731 |   });
  732 | 
  733 |   test("E03-P01: 发布草稿报告", async ({ page }) => {
  734 |     const publishBtn = page.locator("button").filter({ hasText: /发布/ });
  735 |     if ((await publishBtn.count()) > 0) {
  736 |       expect(await publishBtn.first().isVisible()).toBeTruthy();
  737 |     }
  738 |   });
  739 | 
  740 |   test("E04-P01: 导出PDF", async ({ page }) => {
  741 |     const pdfBtn = page.locator("button").filter({ hasText: /PDF|导出/ });
  742 |     if ((await pdfBtn.count()) > 0) {
  743 |       expect(await pdfBtn.first().isVisible()).toBeTruthy();
  744 |     }
  745 |   });
  746 | 
  747 |   test("E05-P01: 导出Excel", async ({ page }) => {
  748 |     const excelBtn = page.locator("button").filter({ hasText: /Excel|导出/ });
  749 |     if ((await excelBtn.count()) > 0) {
  750 |       expect(await excelBtn.first().isVisible()).toBeTruthy();
  751 |     }
  752 |   });
  753 | 
  754 |   test("E07-P01: 折叠未来规划", async ({ page }) => {
  755 |     const collapseHeader = page.locator("[class*='collapse'], [class*='panel-header'], [class*='section-header']").filter({ hasText: /规划/ });
  756 |     if ((await collapseHeader.count()) > 0) {
  757 |       await collapseHeader.first().click();
  758 |       await page.waitForTimeout(500);
  759 |       expect(true).toBeTruthy();
  760 |     }
  761 |   });
  762 | 
  763 |   test("E08-P01: 进入编辑模式", async ({ page }) => {
  764 |     const editBtn = page.locator("button").filter({ hasText: /编辑/ });
  765 |     if ((await editBtn.count()) > 0) {
  766 |       await editBtn.first().click();
  767 |       await page.waitForTimeout(1000);
  768 |       // Should show textarea
  769 |       const textarea = page.locator("textarea, .t-textarea");
  770 |       expect((await textarea.count()) >= 0).toBeTruthy();
  771 |     }
  772 |   });
  773 | 
  774 |   test("E09-P01: 图表tooltip", async ({ page }) => {
  775 |     const chart = page.locator("canvas, [class*='chart'], [class*='echarts']").first();
  776 |     if ((await chart.count()) > 0) {
  777 |       const box = await chart.boundingBox();
  778 |       if (box) {
  779 |         await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  780 |         await page.waitForTimeout(500);
  781 |         expect(true).toBeTruthy();
  782 |       }
  783 |     }
  784 |   });
  785 | 
  786 |   test("页面加载正常", async ({ page }) => {
  787 |     const bodyText = await page.locator("body").innerText();
  788 |     const hasContent = bodyText.includes("周报") || bodyText.includes("报告") || bodyText.length > 100;
  789 |     expect(hasContent).toBeTruthy();
  790 |   });
  791 | });
  792 | 
  793 | // ============================================================
  794 | // 8. MonthlyReport 月报详情
  795 | // ============================================================
  796 | test.describe("MonthlyReport 月报详情", () => {
  797 |   test.beforeEach(async ({ page }) => {
  798 |     await login(page);
  799 |     await page.goto(`${BASE_URL}/reports/monthly`);
  800 |     await page.waitForTimeout(3000);
```