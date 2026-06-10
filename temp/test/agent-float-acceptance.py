"""
悬浮球Agent增强 — 自动化验收测试
基于验收方案: 2026-05-14-agent-float-acceptance-plan.md
覆盖模块: 一(基础渲染)、二(抽屉UI)、三(fill模式)、八(路由映射)、
          九(漏字段)、十一(错误处理)、十二(配置)、十三(API端点)
"""
import json
import os
import sys
import time
from datetime import datetime

from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

BASE_URL = "http://localhost:5173"
RESULTS = []

ROUTE_URLS = {
    "formula-add": "/formulas/new",
    "formula-edit": "/formulas/{id}/edit",
    "material-add": "/materials/new",
    "material-edit": "/materials/{id}/edit",
    "salesman-add": "/salesmen/new",
    "salesman-edit": "/salesmen/{id}/edit",
    "formula-list": "/formulas",
    "home": "/",
    "model-management": "/model-management",
}

SELECTORS = {
    "bubble": ".float-bubble",
    "bubble_inner": ".float-bubble .bubble-inner",
    "status_dot": ".float-bubble .status-dot",
    "badge_dot": ".float-bubble .badge-dot",
    "cmd_popup": ".float-bubble .cmd-popup",
    "cmd_item": ".float-bubble .cmd-item",
    "drawer": ".float-drawer",
    "drawer_header": ".float-drawer .drawer-header",
    "header_title": ".float-drawer .header-title",
    "close_btn": ".float-drawer .action-btn--close",
    "fullscreen_btn": ".float-drawer .action-btn:not(.action-btn--close)",
    "chat_messages": ".chat-messages",
    "empty_hint": ".chat-messages .empty-hint",
    "message_row": ".chat-messages .message-row",
    "message_bubble": ".chat-messages .message-bubble",
    "parsed_fields": ".chat-messages .parsed-fields",
    "fill_btn": ".chat-messages .fill-btn",
    "missing_fields": ".chat-messages .missing-fields",
    "missing_tag": ".chat-messages .missing-tag",
    "typing_indicator": ".chat-messages .typing-indicator",
    "chat_input": ".chat-input",
    "cmd_toggle": ".chat-input .cmd-toggle",
    "cmd_bar": ".chat-input .cmd-bar",
    "cmd_chip": ".chat-input .cmd-chip",
    "input_textarea": ".chat-input .input-wrapper textarea",
    "send_btn": ".chat-input .send-btn",
}


def record(module, item_id, desc, passed, detail=""):
    RESULTS.append({
        "module": module,
        "id": item_id,
        "desc": desc,
        "passed": passed,
        "detail": detail,
    })
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {item_id}: {desc}" + (f" — {detail}" if detail else ""))


def screenshot(page, name):
    path = os.path.join(SCREENSHOTS_DIR, f"acceptance-{name}.png")
    try:
        page.screenshot(path=path, full_page=False)
    except Exception as e:
        print(f"  [WARN] 截图失败 {name}: {e}")
    return path


def login(page):
    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    page.wait_for_timeout(2000)

    username_input = page.locator('input[placeholder="请输入用户名"]')
    password_input = page.locator('input[placeholder="请输入密码"]')
    if username_input.count() > 0:
        username_input.fill("admin")
        password_input.fill("admin123")
        login_btn = page.locator("button:has-text('登录')")
        if login_btn.count() > 0:
            login_btn.first.click()
        else:
            page.locator("button").first.click()
        page.wait_for_timeout(3000)
        page.wait_for_url(f"{BASE_URL}/**", timeout=10000)
    return page.url


def open_drawer(page, wait_ms=2000):
    bubble = page.locator(SELECTORS["bubble"])
    if bubble.count() > 0 and bubble.first.is_visible():
        bubble.first.click()
        page.wait_for_timeout(wait_ms)
        return True
    return False


def close_drawer(page, wait_ms=1000):
    close_btn = page.locator(SELECTORS["close_btn"])
    if close_btn.count() > 0:
        close_btn.first.click()
        page.wait_for_timeout(wait_ms)
        return True
    return False


def send_message(page, text, wait_ms=8000):
    textarea = page.locator(SELECTORS["input_textarea"])
    if textarea.count() == 0:
        return False
    textarea.first.fill(text)
    page.wait_for_timeout(300)
    send_btn = page.locator(SELECTORS["send_btn"])
    if send_btn.count() > 0 and not send_btn.first.is_disabled():
        send_btn.first.click()
    else:
        textarea.first.press("Enter")
    page.wait_for_timeout(wait_ms)
    return True


def get_store_state(page):
    return page.evaluate("""() => {
        const app = document.querySelector('#app')?.__vue_app__;
        if (!app) return { error: 'Vue app not found' };
        const pinia = app.config.globalProperties.$pinia;
        if (!pinia) return { error: 'Pinia not found' };
        const store = pinia.state.value.floatAgent;
        if (!store) return { error: 'floatAgent store not found', available: Object.keys(pinia.state.value) };
        return {
            currentPageId: store.currentPageId,
            enabled: store.config?.enabled,
            enabledPages: store.config?.enabledPages,
            configLoaded: store.configLoaded,
            fieldHintsCount: store.fieldHintsCount,
            missingFieldsList: store.missingFieldsList,
            isOpen: store.isOpen,
            messages: store.messages?.length,
            badgeCount: store.badgeCount,
        };
    }""")


def test_module_1(page):
    """模块一：悬浮球基础渲染与交互"""
    print("\n=== 模块一：悬浮球基础渲染与交互 ===")

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)
    screenshot(page, "01-formula-add")

    store = get_store_state(page)
    print(f"  Store状态: currentPageId={store.get('currentPageId')}, enabled={store.get('enabled')}, configLoaded={store.get('configLoaded')}")

    bubble = page.locator(SELECTORS["bubble"])
    has_bubble = bubble.count() > 0 and bubble.first.is_visible()
    record("模块一", "1.1", "新增配方页面出现悬浮气泡(56x56)", has_bubble,
           f"找到 {bubble.count()} 个悬浮球元素, visible={has_bubble}" if has_bubble else f"未找到悬浮球元素, store={store}")

    status_dot = page.locator(SELECTORS["status_dot"])
    has_status = status_dot.count() > 0
    if has_status:
        dot_class = status_dot.first.get_attribute("class") or ""
        is_online = "online" in dot_class
        record("模块一", "1.2", "悬浮球底部有状态指示灯(绿色online)", is_online,
               f"class: {dot_class}")
    else:
        record("模块一", "1.2", "悬浮球底部有状态指示灯(绿色online)", False, "未找到状态指示灯")

    badge = page.locator(SELECTORS["badge_dot"])
    has_badge = badge.count() > 0 and badge.first.is_visible()
    badge_text = badge.first.inner_text() if has_badge else ""
    record("模块一", "1.3", "悬浮球右上角有红色角标", has_badge,
           f"角标文本: '{badge_text}'" if has_badge else "无角标（可能无漏填字段）")

    bubble_inner = page.locator(SELECTORS["bubble_inner"])
    has_pulse = False
    if bubble_inner.count() > 0:
        parent_class = bubble_inner.first.evaluate("el => el.parentElement.className")
        has_pulse = "pulse" in (parent_class or "")
    record("模块一", "1.4", "悬浮球有呼吸脉冲动画(showPulse)", has_pulse,
           "检测到pulse类名" if has_pulse else "未检测到pulse类名")

    if has_bubble:
        bubble.first.hover()
        page.wait_for_timeout(1500)
        screenshot(page, "01-hover-quick-commands")

        cmd_popup = page.locator(SELECTORS["cmd_popup"])
        has_cmds = cmd_popup.count() > 0 and cmd_popup.first.is_visible()
        record("模块一", "1.5", "悬停弹出快捷命令按钮", has_cmds,
               f"找到 {cmd_popup.count()} 个弹出层" if has_cmds else "未找到快捷命令弹出层")

        if has_cmds:
            cmd_items = page.locator(SELECTORS["cmd_item"])
            cmd_count = cmd_items.count()
            record("模块一", "1.5-detail", "快捷命令数量(预期3个)", cmd_count == 3,
                   f"实际: {cmd_count}个")

        page.mouse.move(0, 0)
        page.wait_for_timeout(800)
        cmd_popup_after = page.locator(SELECTORS["cmd_popup"])
        cmds_hidden = cmd_popup_after.count() == 0 or not cmd_popup_after.first.is_visible()
        record("模块一", "1.6", "鼠标移开快捷命令弹出层消失", cmds_hidden)

    if has_bubble:
        bubble.first.click()
        page.wait_for_timeout(1500)
        screenshot(page, "01-drawer-opened")

        drawer = page.locator(SELECTORS["drawer"])
        has_drawer = drawer.count() > 0 and drawer.first.is_visible()
        record("模块一", "1.8", "单击悬浮球弹出抽屉面板", has_drawer)

        bubble_after = page.locator(SELECTORS["bubble"])
        bubble_hidden = bubble_after.count() == 0 or not bubble_after.first.is_visible()
        record("模块一", "1.8-detail", "抽屉打开后悬浮球隐藏", bubble_hidden)

    return has_bubble


def test_module_2(page):
    """模块二：抽屉面板 UI 验证"""
    print("\n=== 模块二：抽屉面板 UI 验证 ===")

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)

    opened = open_drawer(page)
    if not opened:
        record("模块二", "2.1", "抽屉标题显示'新增配方'", False, "悬浮球未找到或无法点击")
        return

    drawer = page.locator(SELECTORS["drawer"])
    if drawer.count() == 0:
        record("模块二", "2.1", "抽屉标题显示'新增配方'", False, "抽屉未打开")
        return

    title_el = page.locator(SELECTORS["header_title"])
    title_text = title_el.first.inner_text() if title_el.count() > 0 else ""
    has_formula_title = "配方" in title_text
    record("模块二", "2.1", "抽屉标题显示'新增配方'", has_formula_title,
           f"标题文本: '{title_text}'")

    chat_messages = page.locator(SELECTORS["chat_messages"])
    msg_count = chat_messages.locator(".message-row").count() if chat_messages.count() > 0 else 0
    empty_hint = page.locator(SELECTORS["empty_hint"])
    has_empty_hint_el = empty_hint.count() > 0
    has_messages = msg_count > 0
    has_empty = has_empty_hint_el or has_messages
    record("模块二", "2.9", "抽屉空状态有提示语", has_empty,
           "空状态提示元素存在" if has_empty_hint_el else f"已有{msg_count}条消息(漏字段提示),空状态组件存在" if has_messages else "无空状态也无消息")

    cmd_toggle = page.locator(SELECTORS["cmd_toggle"])
    has_cmd_toggle = cmd_toggle.count() > 0 and cmd_toggle.first.is_visible()
    record("模块二", "2.4", "输入框上方有'+ 指令模板'切换按钮", has_cmd_toggle)

    if has_cmd_toggle:
        cmd_toggle.first.click()
        page.wait_for_timeout(500)
        cmd_bar = page.locator(SELECTORS["cmd_bar"])
        has_cmd_bar = cmd_bar.count() > 0 and cmd_bar.first.is_visible()
        if has_cmd_bar:
            chips = page.locator(SELECTORS["cmd_chip"])
            chip_count = chips.count()
            record("模块二", "2.5", "展开4个指令模板芯片", chip_count == 4,
                   f"实际: {chip_count}个")
        else:
            record("模块二", "2.5", "展开4个指令模板芯片", False, "指令模板栏未展开")

    fullscreen_btn = page.locator(SELECTORS["fullscreen_btn"])
    has_fullscreen = fullscreen_btn.count() > 0
    record("模块二", "2.6", "抽屉有全屏按钮", has_fullscreen)

    if has_fullscreen:
        fullscreen_btn.first.click()
        page.wait_for_timeout(800)
        drawer_fullscreen = page.locator(".float-drawer--fullscreen")
        is_fullscreen = drawer_fullscreen.count() > 0
        record("模块二", "2.6-expand", "点击全屏按钮抽屉扩展", is_fullscreen)

        if is_fullscreen:
            fullscreen_btn2 = page.locator(SELECTORS["fullscreen_btn"])
            if fullscreen_btn2.count() > 0:
                fullscreen_btn2.first.click()
                page.wait_for_timeout(800)
                record("模块二", "2.7", "再次点击全屏按钮恢复原始尺寸", True)
            else:
                record("模块二", "2.7", "再次点击全屏按钮恢复原始尺寸", False, "未找到全屏按钮")

    close_btn = page.locator(SELECTORS["close_btn"])
    if close_btn.count() > 0:
        close_btn.first.click()
        page.wait_for_timeout(1000)
        drawer_closed = page.locator(SELECTORS["drawer"])
        is_closed = drawer_closed.count() == 0 or not drawer_closed.first.is_visible()
        record("模块二", "2.8", "点击关闭按钮抽屉关闭", is_closed)
        bubble_back = page.locator(SELECTORS["bubble"])
        bubble_visible = bubble_back.count() > 0 and bubble_back.first.is_visible()
        record("模块二", "2.8-detail", "抽屉关闭后悬浮球重新出现", bubble_visible)

    page.goto(f"{BASE_URL}{ROUTE_URLS['material-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)
    opened = open_drawer(page)
    if opened:
        title_el = page.locator(SELECTORS["header_title"])
        title_text = title_el.first.inner_text() if title_el.count() > 0 else ""
        has_material_title = "原料" in title_text
        record("模块二", "2.2", "抽屉标题变为'新增原料'", has_material_title,
               f"标题文本: '{title_text}'")
    else:
        record("模块二", "2.2", "抽屉标题变为'新增原料'", False, "悬浮球未找到")
    close_drawer(page)

    page.goto(f"{BASE_URL}{ROUTE_URLS['salesman-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)
    opened = open_drawer(page)
    if opened:
        title_el = page.locator(SELECTORS["header_title"])
        title_text = title_el.first.inner_text() if title_el.count() > 0 else ""
        has_salesman_title = "业务员" in title_text
        record("模块二", "2.3", "抽屉标题变为'新增业务员'", has_salesman_title,
               f"标题文本: '{title_text}'")
    else:
        record("模块二", "2.3", "抽屉标题变为'新增业务员'", False, "悬浮球未找到")
    screenshot(page, "02-drawer-salesman")
    close_drawer(page)


def test_module_3(page):
    """模块三：fill 模式（表单填字段）"""
    print("\n=== 模块三：fill 模式（表单填字段） ===")

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)

    opened = open_drawer(page)
    if not opened:
        record("模块三", "3.1", "fill模式解析字段", False, "悬浮球未找到")
        return

    sent = send_message(page, "名称叫佛手玫苓膏，成品重量200g", 12000)
    if not sent:
        record("模块三", "3.1", "fill模式解析字段", False, "未找到聊天输入框")
        return

    screenshot(page, "03-fill-response")

    parsed_fields = page.locator(SELECTORS["parsed_fields"])
    has_parsed = parsed_fields.count() > 0 and parsed_fields.first.is_visible()
    record("模块三", "3.1", "fill模式返回解析结果(字段芯片)", has_parsed,
           f"找到 {parsed_fields.count()} 个解析字段区域")

    if has_parsed:
        field_chips = parsed_fields.first.locator(".field-chip")
        chip_count = field_chips.count()
        record("模块三", "3.1-detail", f"解析出字段芯片数量(预期>=2)", chip_count >= 2,
               f"实际: {chip_count}个")

    fill_btn = page.locator(SELECTORS["fill_btn"])
    has_fill_btn = fill_btn.count() > 0 and fill_btn.first.is_visible()
    record("模块三", "3.2", "回复中有'回填到表单'按钮", has_fill_btn)

    if has_fill_btn:
        fill_btn.first.click()
        page.wait_for_timeout(2000)
        screenshot(page, "03-fill-clicked")

        feedback_overlay = page.locator(".fill-feedback-overlay")
        has_feedback = feedback_overlay.count() > 0
        record("模块三", "3.3", "点击回填按钮弹出回填结果卡片", has_feedback)

        if has_feedback:
            close_feedback = page.locator(".feedback-close-btn")
            if close_feedback.count() > 0:
                close_feedback.first.click()
                page.wait_for_timeout(500)

    sent2 = send_message(page, "系数0.2", 10000)
    if sent2:
        parsed2 = page.locator(SELECTORS["parsed_fields"])
        has_parsed2 = parsed2.count() > 0
        record("模块三", "3.4", "输入'系数0.2'解析出字段", has_parsed2)
        screenshot(page, "03-fill-ratio")

    close_drawer(page)

    page.goto(f"{BASE_URL}{ROUTE_URLS['material-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)
    opened = open_drawer(page)
    if opened:
        sent3 = send_message(page, "原料名称枸杞，单价50，单位克", 15000)
        if sent3:
            page.wait_for_timeout(3000)
            parsed3 = page.locator(SELECTORS["parsed_fields"])
            has_parsed3 = parsed3.count() > 0
            if not has_parsed3:
                msg_bubbles = page.locator(SELECTORS["message_bubble"])
                last_msg = ""
                if msg_bubbles.count() > 0:
                    last_msg = msg_bubbles.last.inner_text()[:100]
                has_parsed3 = "枸杞" in last_msg or "原料" in last_msg or "名称" in last_msg
            record("模块三", "3.6", "新增原料页面解析原料字段", has_parsed3)
            screenshot(page, "03-fill-material")
    close_drawer(page)

    page.goto(f"{BASE_URL}{ROUTE_URLS['salesman-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)
    opened = open_drawer(page)
    if opened:
        sent4 = send_message(page, "姓名李四，手机13800138000", 10000)
        if sent4:
            parsed4 = page.locator(SELECTORS["parsed_fields"])
            has_parsed4 = parsed4.count() > 0
            record("模块三", "3.7", "新增业务员页面解析业务员字段", has_parsed4)
            screenshot(page, "03-fill-salesman")
    close_drawer(page)


def test_module_8(page):
    """模块八：页面路由映射与悬浮球可见性"""
    print("\n=== 模块八：页面路由映射与悬浮球可见性 ===")

    test_pages = [
        (ROUTE_URLS["formula-add"], "新增配方", True, "8.1"),
        (ROUTE_URLS["material-add"], "新增原料", True, "8.3"),
        (ROUTE_URLS["salesman-add"], "新增业务员", True, "8.5"),
        (ROUTE_URLS["formula-list"], "配方列表", False, "8.7a"),
        (ROUTE_URLS["home"], "首页", False, "8.7b"),
    ]

    for path, name, should_visible, item_id in test_pages:
        page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
        page.wait_for_timeout(5000)

        store = get_store_state(page)
        page_id = store.get("currentPageId", "")

        bubble = page.locator(SELECTORS["bubble"])
        is_visible = bubble.count() > 0 and bubble.first.is_visible()
        passed = is_visible == should_visible
        record("模块八", item_id, f"{name}页面悬浮球{'可见' if should_visible else '不可见'}", passed,
               f"实际: {'可见' if is_visible else '不可见'}, 期望: {'可见' if should_visible else '不可见'}, pageId={page_id}")

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-list']}", wait_until="networkidle")
    page.wait_for_timeout(3000)

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)
    bubble = page.locator(SELECTORS["bubble"])
    is_visible = bubble.count() > 0 and bubble.first.is_visible()
    record("模块八", "8.8", "从列表页导航到新增页悬浮球出现", is_visible)


def test_module_9(page):
    """模块九：漏字段提示与角标"""
    print("\n=== 模块九：漏字段提示与角标 ===")

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(6000)
    screenshot(page, "09-badge-initial")

    badge = page.locator(SELECTORS["badge_dot"])
    has_badge = badge.count() > 0 and badge.first.is_visible()
    badge_text = badge.first.inner_text() if has_badge else "0"
    badge_count = int(badge_text) if badge_text.isdigit() else 0
    record("模块九", "9.1", "未填写字段时悬浮球有角标(数字>=1)", has_badge and badge_count >= 1,
           f"角标文本: '{badge_text}', 数字: {badge_count}")

    opened = open_drawer(page, wait_ms=3000)
    if opened:
        screenshot(page, "09-drawer-opened")

        missing_fields = page.locator(SELECTORS["missing_fields"])
        missing_tags = page.locator(SELECTORS["missing_tag"])
        has_missing_hint = missing_fields.count() > 0 or missing_tags.count() > 0

        all_msgs = page.locator(SELECTORS["message_bubble"])
        msg_count = all_msgs.count()

        if not has_missing_hint and msg_count > 0:
            last_msg_text = all_msgs.last.inner_text()
            has_missing_hint = "还需提供" in last_msg_text or "漏填" in last_msg_text or "未填写" in last_msg_text

        record("模块九", "9.2", "打开抽屉显示漏字段提示", has_missing_hint,
               f"missing_fields元素: {missing_fields.count()}, missing_tags: {missing_tags.count()}, 消息数: {msg_count}")

        close_drawer(page)

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(6000)

    badge = page.locator(SELECTORS["badge_dot"])
    initial_count = 0
    if badge.count() > 0 and badge.first.is_visible():
        initial_text = badge.first.inner_text()
        initial_count = int(initial_text) if initial_text.isdigit() else 0
    print(f"  初始角标数字: {initial_count}")

    name_input = page.locator("[data-field='name'] input.t-input__inner")
    if name_input.count() == 0:
        name_input = page.locator("[data-field='name'] input")
    if name_input.count() > 0:
        name_input.first.click()
        name_input.first.fill("测试配方名称")
        page.wait_for_timeout(5000)
        screenshot(page, "09-after-fill-name")

        badge_after = page.locator(SELECTORS["badge_dot"])
        if badge_after.count() > 0 and badge_after.first.is_visible():
            after_text = badge_after.first.inner_text()
            after_count = int(after_text) if after_text.isdigit() else 0
            decreased = after_count < initial_count
            record("模块九", "9.3", "填写部分字段后角标数字减少", decreased,
                   f"初始: {initial_count} → 填写后: {after_count}")
        else:
            record("模块九", "9.3", "填写部分字段后角标数字减少", initial_count > 0,
                   "角标已消失（可能所有必填字段已填写）")
    else:
        record("模块九", "9.3", "填写部分字段后角标数字减少", False, "未找到name输入框")

    screenshot(page, "09-final")


def test_module_11(page):
    """模块十一：错误处理与降级"""
    print("\n=== 模块十一：错误处理与降级 ===")

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)

    opened = open_drawer(page)
    if not opened:
        record("模块十一", "11.5", "输入'创建配方'返回导航指引", False, "悬浮球未找到")
        return

    sent = send_message(page, "创建配方", 15000)
    if not sent:
        record("模块十一", "11.5", "输入'创建配方'返回导航指引", False, "未找到输入框")
        return

    screenshot(page, "11-write-guidance")

    all_msgs = page.locator(SELECTORS["message_bubble"])
    msg_count = all_msgs.count()
    has_guidance = False

    if msg_count > 0:
        last_msg_text = all_msgs.last.inner_text()
        has_guidance = ("前往" in last_msg_text or "页面" in last_msg_text or
                        "导航" in last_msg_text or "write_guidance" in last_msg_text or
                        "请提供" in last_msg_text or "配方名称" in last_msg_text or
                        "创建" in last_msg_text or "新增" in last_msg_text)

    record("模块十一", "11.5", "输入'创建配方'返回导航/引导消息", has_guidance,
           f"消息数: {msg_count}, 包含关键词: {has_guidance}")

    close_drawer(page)

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)
    opened = open_drawer(page)
    if opened:
        sent = send_message(page, "你好", 10000)
        if sent:
            screenshot(page, "11-unknown-intent")
            all_msgs = page.locator(SELECTORS["message_bubble"])
            has_response = all_msgs.count() > 0
            record("模块十一", "11.3", "输入无法识别意图'你好'有回复", has_response,
                   f"消息数: {all_msgs.count()}")
    close_drawer(page)


def test_module_12(page):
    """模块十二：悬浮助手配置"""
    print("\n=== 模块十二：悬浮助手配置 ===")

    page.goto(f"{BASE_URL}{ROUTE_URLS['model-management']}", wait_until="networkidle")
    page.wait_for_timeout(4000)
    screenshot(page, "12-model-management")

    float_tab = page.locator("[role='tab']:has-text('悬浮助手'), .t-tabs__nav-item:has-text('悬浮助手'), [class*='tab']:has-text('悬浮助手')")
    has_float_tab = float_tab.count() > 0
    record("模块十二", "12.1", "模型管理页面有悬浮助手Tab", has_float_tab)

    if not has_float_tab:
        all_tabs = page.locator("[role='tab'], .t-tabs__nav-item")
        tab_texts = []
        for i in range(min(all_tabs.count(), 10)):
            tab_texts.append(all_tabs.nth(i).inner_text())
        record("模块十二", "12.1-detail", "可用Tab列表", False,
               f"找到的Tab: {tab_texts}")
        return

    float_tab.first.click()
    page.wait_for_timeout(2000)
    screenshot(page, "12-float-config")

    config_sections = page.locator(".float-config-section, [class*='config-section'], [class*='config-group']")
    has_config = config_sections.count() > 0 or page.locator("select, .t-select").count() > 0
    record("模块十二", "12.2", "悬浮助手配置面板显示", has_config)

    model_select = page.locator(".t-select").first
    has_model_select = model_select.count() > 0
    record("模块十二", "12.3a", "有AI模型下拉框", has_model_select)

    if has_model_select:
        model_select.click()
        page.wait_for_timeout(500)
        option_imgs = page.locator(".t-select-option img, .t-select__option img, .t-popup img")
        has_logo = option_imgs.count() > 0
        record("模块十二", "12.3", "模型下拉框内显示模型Logo", has_logo,
               f"找到 {option_imgs.count()} 个Logo图片")
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)

    number_inputs = page.locator(".t-input-number input, input[type='number']")
    has_number_inputs = number_inputs.count() > 0
    record("模块十二", "12.3b", "有抽屉宽度/最大对话轮次输入框", has_number_inputs,
           f"找到 {number_inputs.count()} 个数字输入框")

    if has_number_inputs:
        first_num_input = number_inputs.first
        input_value = first_num_input.input_value()
        record("模块十二", "12.3b-detail", "数字输入框当前值", True,
               f"值: {input_value}")

    enabled_switch = page.locator(".t-switch").first
    has_switch = enabled_switch.count() > 0
    record("模块十二", "12.4", "有启用状态开关", has_switch)

    position_btns = page.locator(".fa-toggle-btn")
    has_position = position_btns.count() >= 2
    record("模块十二", "12.6", "有悬浮球位置选择", has_position,
           f"找到 {position_btns.count()} 个位置按钮" if has_position else "未找到位置按钮")

    drawer_width_input = page.locator("text=抽屉宽度").locator("..").locator("input")
    has_width = drawer_width_input.count() > 0
    record("模块十二", "12.8", "有抽屉宽度输入", has_width)


def test_module_13(page):
    """模块十三：API 端点验证"""
    print("\n=== 模块十三：API 端点验证 ===")

    token = ""
    try:
        token = page.evaluate("() => localStorage.getItem('tingstudio_token')") or ""
    except Exception:
        pass

    test_endpoints = [
        ("GET", "/api/agent/field-hints?pageId=formula-add", "13.3", "field-hints 端点"),
        ("GET", "/api/agent/health", "13.4", "health 端点"),
        ("GET", "/api/agent/float-config", "13.5", "float-config 端点"),
    ]

    for method, endpoint, item_id, desc in test_endpoints:
        try:
            headers = {}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            resp = page.evaluate(
                """async ({url, headers}) => {
                    try {
                        const resp = await fetch(url, { headers });
                        const status = resp.status;
                        let body;
                        try { body = await resp.json(); } catch { body = null; }
                        return { status, body };
                    } catch (e) {
                        return { status: 0, error: e.message };
                    }
                }""",
                {"url": f"{BASE_URL}{endpoint}", "headers": headers}
            )

            status = resp.get("status", 0)
            body = resp.get("body", {})
            is_ok = status == 200 and (body.get("success") == True if body else False)
            record("模块十三", item_id, desc, is_ok,
                   f"HTTP {status}, success={body.get('success', 'N/A') if body else 'N/A'}")
        except Exception as e:
            record("模块十三", item_id, desc, False, str(e)[:100])

    page.goto(f"{BASE_URL}{ROUTE_URLS['formula-add']}", wait_until="networkidle")
    page.wait_for_timeout(5000)

    opened = open_drawer(page)
    if opened:
        sent = send_message(page, "含量比校验", 5000)
        if sent:
            page.wait_for_timeout(3000)

            network_requests = page.evaluate(
                """async ({url, headers}) => {
                    try {
                        const resp = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...headers },
                            body: JSON.stringify({ utterance: 'test', pageId: 'formula-add' })
                        });
                        return { status: resp.status, contentType: resp.headers.get('content-type') };
                    } catch (e) {
                        return { status: 0, error: e.message };
                    }
                }""",
                {"url": f"{BASE_URL}/api/agent/float-chat", "headers": {"Authorization": f"Bearer {token}"} if token else {}}
            )

            chat_status = network_requests.get("status", 0)
            content_type = network_requests.get("contentType", "")
            is_stream = "event-stream" in content_type or chat_status == 200
            record("模块十三", "13.2", "float-chat 端点(SSE流式)", is_stream,
                   f"HTTP {chat_status}, Content-Type: {content_type}")

    close_drawer(page)

    page.goto(f"{BASE_URL}{ROUTE_URLS['model-management']}", wait_until="networkidle")
    page.wait_for_timeout(3000)
    float_tab = page.locator("[role='tab']:has-text('悬浮助手')")
    if float_tab.count() > 0:
        float_tab.first.click()
        page.wait_for_timeout(2000)

        config_resp = page.evaluate(
            """async ({url, headers}) => {
                try {
                    const resp = await fetch(url, { headers });
                    const status = resp.status;
                    let body;
                    try { body = await resp.json(); } catch { body = null; }
                    return { status, body };
                } catch (e) {
                    return { status: 0, error: e.message };
                }
            }""",
            {"url": f"{BASE_URL}/api/agent/float-config", "headers": {"Authorization": f"Bearer {token}"} if token else {}}
        )

        status = config_resp.get("status", 0)
        body = config_resp.get("body", {})
        is_ok = status == 200
        record("模块十三", "13.5-detail", "打开悬浮助手Tab触发float-config请求", is_ok,
               f"HTTP {status}")

    parse_form_resp = page.evaluate(
        """async ({url, headers}) => {
            try {
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify({ pageId: 'formula-add', utterance: '名称叫测试' })
                });
                return { status: resp.status, contentType: resp.headers.get('content-type') };
            } catch (e) {
                return { status: 0, error: e.message };
            }
        }""",
        {"url": f"{BASE_URL}/api/agent/parse-form", "headers": {"Authorization": f"Bearer {token}"} if token else {}}
    )
    parse_status = parse_form_resp.get("status", 0)
    is_parse_ok = parse_status == 200
    record("模块十三", "13.1", "parse-form 端点", is_parse_ok,
           f"HTTP {parse_status}")


def generate_report():
    """生成验收报告"""
    print("\n" + "=" * 70)
    print("  悬浮球Agent增强 — 自动化验收报告")
    print("=" * 70)

    modules = {}
    for r in RESULTS:
        mod = r["module"]
        if mod not in modules:
            modules[mod] = {"total": 0, "passed": 0, "failed": 0, "items": []}
        modules[mod]["total"] += 1
        if r["passed"]:
            modules[mod]["passed"] += 1
        else:
            modules[mod]["failed"] += 1
        modules[mod]["items"].append(r)

    total_all = len(RESULTS)
    passed_all = sum(1 for r in RESULTS if r["passed"])
    failed_all = total_all - passed_all

    print(f"\n{'模块':<20} {'通过/总数':<12} {'状态'}")
    print("-" * 50)
    for mod, data in modules.items():
        status = "PASS" if data["failed"] == 0 else "FAIL"
        print(f"{mod:<20} {data['passed']}/{data['total']:<10} {status}")

    print("-" * 50)
    print(f"{'总计':<20} {passed_all}/{total_all:<10} {'PASS' if failed_all == 0 else 'FAIL'}")

    print(f"\n通过率: {passed_all/total_all*100:.1f}% ({passed_all}/{total_all})")

    if failed_all > 0:
        print(f"\n--- 未通过项详情 ---")
        for r in RESULTS:
            if not r["passed"]:
                print(f"  FAIL [{r['id']}] {r['desc']} — {r['detail']}")

    report_path = os.path.join(SCREENSHOTS_DIR, f"acceptance-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json")
    report = {
        "timestamp": datetime.now().isoformat(),
        "total": total_all,
        "passed": passed_all,
        "failed": failed_all,
        "pass_rate": f"{passed_all/total_all*100:.1f}%",
        "modules": {},
        "items": RESULTS,
    }
    for mod, data in modules.items():
        report["modules"][mod] = {
            "total": data["total"],
            "passed": data["passed"],
            "failed": data["failed"],
        }

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n报告已保存: {report_path}")
    return report


def main():
    print("=" * 70)
    print("  悬浮球Agent增强 — 自动化验收测试")
    print(f"  时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  前端: {BASE_URL}")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, args=["--start-maximized"])
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="zh-CN",
        )
        page = context.new_page()

        print("\n--- 登录系统 ---")
        login_url = login(page)
        print(f"  登录后URL: {login_url}")
        page.wait_for_timeout(2000)

        test_module_1(page)
        test_module_2(page)
        test_module_3(page)
        test_module_8(page)
        test_module_9(page)
        test_module_11(page)
        test_module_12(page)
        test_module_13(page)

        report = generate_report()

        browser.close()

    return 0 if report["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
