const { chromium } = require("playwright");

// 部署的登录页面 URL
const TARGET_URL = "https://tingstudio-frontend-jnvxqqcv.edgeone.cool/login";

(async () => {
  console.log("=== 开始登录功能诊断测试 ===\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // 监听控制台消息
  page.on("console", msg => {
    if (msg.type() === "error") {
      console.log(`[浏览器控制台错误] ${msg.text()}`);
    }
  });

  // 监听页面错误
  page.on("pageerror", err => {
    console.log(`[页面异常] ${err.message}`);
  });

  // 监听请求失败
  page.on("requestfailed", req => {
    console.log(`[请求失败] ${req.url()} - ${req.failure()?.errorText}`);
  });

  // 监听所有 API 请求
  const apiRequests = [];
  page.on("request", req => {
    if (req.url().includes("/api/") || req.url().includes("/auth/")) {
      apiRequests.push({
        url: req.url(),
        method: req.method(),
        timestamp: new Date().toISOString(),
      });
      console.log(`[API请求] ${req.method()} ${req.url()}`);
    }
  });

  // 监听响应
  page.on("response", async res => {
    if (res.url().includes("/api/") || res.url().includes("/auth/")) {
      try {
        const body = await res.text();
        console.log(`[API响应] ${res.status()} ${res.url()}`);
        console.log(`  响应体: ${body.substring(0, 200)}`);
      } catch (e) {
        console.log(`[API响应] ${res.status()} ${res.url()}`);
      }
    }
  });

  try {
    console.log(`1️⃣ 正在访问登录页面: ${TARGET_URL}\n`);

    const response = await page.goto(TARGET_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log(`✅ 页面访问成功`);
    console.log(`   状态码: ${response?.status()}`);
    console.log(`   最终URL: ${page.url()}`);
    console.log(`   页面标题: ${await page.title()}`);

    // 截图 - 登录页面初始状态
    await page.screenshot({
      path: "d:/Program Data/workspace-codebd/TingStudio/test-login-initial.png",
      fullPage: true,
    });
    console.log("\n📸 截图已保存: test-login-initial.png");

    // 检查页面内容
    const bodyText = await page.evaluate(() => document.body?.innerText || "");

    if (bodyText.includes("401") || bodyText.includes("UNAUTHORIZED")) {
      console.log("\n❌ 发现 401 UNAUTHORIZED 错误！");
      console.log("   这可能是 EdgeOne Pages 的访问控制问题");

      await page.screenshot({
        path: "d:/Program Data/workspace-codebd/TingStudio/test-login-error.png",
        fullPage: true,
      });

      console.log("\n📸 错误截图已保存: test-login-error.png");
      console.log("\n💡 解决方案:");
      console.log("   1. 登录腾讯云 EdgeOne 控制台");
      console.log("   2. 找到项目 pages-jnvxqqcv");
      console.log('   3. 点击"预览"或"发布"按钮生成新的访问链接');
      console.log("   4. 或者检查访问控制规则是否限制了访问");

      await browser.close();
      return;
    }

    if (!bodyText.includes("登录") && !bodyText.includes("Login")) {
      console.log("\n⚠️  页面可能未正确加载，未找到登录表单");
      console.log("   页面内容前500字符:", bodyText.substring(0, 500));

      await browser.close();
      return;
    }

    console.log("\n2️⃣ 登录表单检测完成，准备填写凭据\n");

    // 等待并查找输入框
    await page.waitForSelector("input", { timeout: 10000 });

    const inputs = await page.locator("input").all();
    console.log(`   找到 ${inputs.length} 个输入框`);

    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute("type");
      const placeholder = await inputs[i].getAttribute("placeholder");
      const name = await inputs[i].getAttribute("name");
      console.log(`   输入框[${i}]: type=${type}, name=${name}, placeholder=${placeholder}`);
    }

    // 填写登录表单
    if (inputs.length >= 2) {
      console.log("\n3️⃣ 填写登录表单 (admin / admin123)\n");

      // 填写用户名
      await inputs[0].fill("admin");
      console.log("   ✅ 用户名已填写: admin");

      // 填写密码
      await inputs[1].fill("admin123");
      console.log("   ✅ 密码已填写: admin123");

      // 截图 - 表单填写后
      await page.screenshot({
        path: "d:/Program Data/workspace-codebd/TingStudio/test-login-filled.png",
        fullPage: true,
      });
      console.log("\n📸 截图已保存: test-login-filled.png");

      // 查找并点击登录按钮
      console.log("\n4️⃣ 点击登录按钮...\n");

      const buttons = await page.locator("button").all();
      let loginButton = null;

      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].innerText();
        console.log(`   按钮[${i}]: "${text}"`);

        if (text.includes("登录") || text.includes("Login")) {
          loginButton = buttons[i];
          break;
        }
      }

      if (loginButton) {
        // 监听导航
        const navigationPromise = page
          .waitForNavigation({
            waitUntil: "networkidle",
            timeout: 15000,
          })
          .catch(() => null);

        await loginButton.click();
        console.log("   ✅ 已点击登录按钮");

        // 等待响应
        await navigationPromise;
        await page.waitForTimeout(3000);

        console.log(`\n5️⃣ 登录响应分析:\n`);
        console.log(`   当前URL: ${page.url()}`);
        console.log(`   页面标题: ${await page.title()}`);

        // 截图 - 登录结果
        await page.screenshot({
          path: "d:/Program Data/workspace-codebd/TingStudio/test-login-result.png",
          fullPage: true,
        });
        console.log("\n📸 结果截图已保存: test-login-result.png");

        // 检查是否登录成功
        const currentUrl = page.url();
        const currentBody = await page.evaluate(() => document.body?.innerText || "");

        if (currentUrl.includes("/dashboard") || currentUrl.includes("/home") || currentUrl === "/") {
          console.log("\n✅ 登录成功！已跳转到主页");
        } else if (currentUrl.includes("/login")) {
          console.log("\n❌ 登录失败，仍在登录页面");

          // 检查错误提示
          const errorElements = await page.locator('.t-message, .error, [class*="error"], [class*="fail"]').all();
          for (const el of errorElements) {
            const text = await el.innerText();
            if (text.trim()) {
              console.log(`   错误信息: ${text}`);
            }
          }

          // 检查 toast/notification
          const toasts = await page.locator(".t-toast, .notification, .alert").all();
          for (const toast of toasts) {
            const text = await toast.innerText();
            if (text.trim()) {
              console.log(`   提示信息: ${text}`);
            }
          }
        } else {
          console.log(`\n⚠️  页面跳转到: ${currentUrl}`);
        }

        // 输出 API 请求摘要
        console.log("\n6️⃣ API 请求摘要:\n");
        console.log(`   总共发起 ${apiRequests.length} 个 API 请求`);
        apiRequests.forEach((req, idx) => {
          console.log(`   ${idx + 1}. ${req.method} ${req.url}`);
        });
      } else {
        console.log("\n❌ 未找到登录按钮");
      }
    } else {
      console.log("\n❌ 未找到足够的输入框（需要至少2个：用户名和密码）");
    }
  } catch (error) {
    console.error("\n❌ 测试过程中发生错误:", error.message);

    await page
      .screenshot({
        path: "d:/Program Data/workspace-codebd/TingStudio/test-login-crash.png",
        fullPage: true,
      })
      .catch(() => {});

    console.log("\n📸 错误截图已保存: test-login-crash.png");
  } finally {
    console.log("\n7️⃣ 关闭浏览器...\n");
    await browser.close();
    console.log("=== 测试完成 ===\n");
  }
})();
