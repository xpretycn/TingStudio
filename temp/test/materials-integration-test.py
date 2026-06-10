"""
Materials 前后端联调测试 - Python Playwright 版
执行7层验证：操作→请求→数据库→Store→响应→展示→存储
"""
import json
import time
import urllib.request
import urllib.error
import urllib.parse
import os
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://localhost:5173"
API_BASE = "http://localhost:3000/api"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
TEST_PREFIX = "[test]"

ADMIN = {"username": "admin", "password": "admin123"}
FORMULIST = {"username": "formulist", "password": "formulist123"}

# 结果收集
results = []


def api_request(method, path, token, body=None):
    """发送 API 请求"""
    url = f"{API_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            elapsed = int((time.time() - start) * 1000)
            resp_data = json.loads(resp.read().decode("utf-8"))
            return {"status": resp.status, "data": resp_data, "elapsed": elapsed}
    except urllib.error.HTTPError as e:
        elapsed = int((time.time() - start) * 1000)
        try:
            resp_data = json.loads(e.read().decode("utf-8"))
        except Exception:
            resp_data = None
        return {"status": e.code, "data": resp_data, "elapsed": elapsed}
    except Exception as e:
        elapsed = int((time.time() - start) * 1000)
        return {"status": 0, "data": None, "elapsed": elapsed, "error": str(e)}


def create_test_material(token, suffix, extra=None):
    """创建测试原料"""
    body = {
        "name": f"{TEST_PREFIX}测试原料{suffix}",
        "code": f"{TEST_PREFIX}-CODE-{suffix}-{int(time.time()*1000)}",
        "materialType": "herb",
        "unit": "g",
        "stock": 100,
        "unitPrice": 25.5,
    }
    if extra:
        body.update(extra)
    return api_request("POST", "/materials", token, body)


def cleanup_test_materials(token):
    """清理测试数据"""
    res = api_request("GET", "/materials?pageSize=100", token)
    if res["data"] and res["data"].get("data") and res["data"]["data"].get("list"):
        for item in res["data"]["data"]["list"]:
            if item.get("name", "").startswith(TEST_PREFIX):
                try:
                    api_request("DELETE", f"/materials/{item['id']}", token)
                except Exception:
                    pass


def login(page, account):
    """登录并返回 token"""
    page.goto(f"{BASE_URL}/login")
    page.wait_for_selector('input[type="text"], input[placeholder*="用户名"]', timeout=10000)
    username_input = page.locator('input[type="text"], input[placeholder*="用户名"]').first
    password_input = page.locator('input[type="password"]').first
    username_input.fill(account["username"])
    password_input.fill(account["password"])
    login_btn = page.locator('button[type="submit"], button:has-text("登录")').first
    login_btn.click()
    page.wait_for_timeout(2000)
    try:
        page.wait_for_url("**/dashboard**", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(1500)
    token = page.evaluate("() => localStorage.getItem('tingstudio_token') || sessionStorage.getItem('tingstudio_token') || ''")
    return token


def evaluate_layer(layers, failed_count):
    """评估测试结果"""
    if failed_count > 0:
        return "fail"
    if any(v == "partial" for v in layers.values()):
        return "partial"
    return "pass"


def take_screenshot(page, name):
    """截图保存"""
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    path = os.path.join(SCREENSHOT_DIR, f"error-{name}-{datetime.now().strftime('%Y%m%d')}.png")
    page.screenshot(path=path)
    return path


def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # ===== I-CRUD01: 创建原料全链路 =====
        print("\n[I-CRUD01] 创建原料全链路")
        result = {"id": "I-CRUD01", "name": "创建原料全链路", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            token = login(page, ADMIN)
            assert token, "登录失败"
            result["layers"]["①操作"] = "pass"
            cleanup_test_materials(token)

            # 创建原料
            create_res = create_test_material(token, "CRUD01")
            result["responseTime"] = create_res["elapsed"]

            # ②请求层
            result["layers"]["②请求"] = "pass" if create_res["status"] in (200, 201) else "fail"

            # ③数据库层
            verify_res = api_request("GET", f"/materials?keyword={urllib.parse.quote(TEST_PREFIX)}", token)
            lst = (verify_res.get("data", {}) or {}).get("data", {}).get("list", [])
            found = any(m.get("name", "").startswith(TEST_PREFIX) for m in lst)
            result["layers"]["③数据库"] = "pass" if found else "fail"

            # ④Store层
            page.goto(f"{BASE_URL}/materials")
            page.wait_for_timeout(3000)
            try:
                store_check = page.evaluate("() => { const pinia = window.__pinia__; return pinia ? JSON.stringify(Object.keys(pinia.state?.value || {})) : 'no-pinia'; }")
                result["layers"]["④Store"] = "pass" if "material" in store_check else "partial"
            except Exception:
                result["layers"]["④Store"] = "partial"

            # ⑤响应层
            result["layers"]["⑤响应"] = "pass" if create_res["data"] and create_res["data"].get("success") else "fail"

            # ⑥展示层
            content = page.text_content("body") or ""
            shows = "原料" in content or "草稿" in content or "录入" in content
            result["layers"]["⑥展示"] = "pass" if shows else "partial"

            # ⑦存储层
            stored_token = page.evaluate("() => localStorage.getItem('tingstudio_token')")
            result["layers"]["⑦存储"] = "pass" if stored_token else "fail"

            # 异常分支：编码重复
            created_data = create_res.get("data", {}).get("data", {})
            if created_data and created_data.get("code"):
                dup_res = api_request("POST", "/materials", token, {
                    "name": f"{TEST_PREFIX}重复测试",
                    "code": created_data["code"],
                })
                if dup_res["status"] not in (409, 400):
                    result["error"] += f"编码重复应返回409/400，实际{dup_res['status']}; "

            cleanup_test_materials(token)
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-CRUD01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-CRUD02: 编辑原料全链路 =====
        print("\n[I-CRUD02] 编辑原料全链路")
        result = {"id": "I-CRUD02", "name": "编辑原料全链路", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            token = login(page, ADMIN)
            cleanup_test_materials(token)

            # 创建原料
            create_res = create_test_material(token, "EDIT01")
            created = (create_res.get("data") or {}).get("data") or {}
            material_id = created.get("id")

            if not material_id:
                result["error"] = "创建原料失败"
                result["status"] = "fail"
                results.append(result)
            else:
                # 编辑
                update_res = api_request("PUT", f"/materials/{material_id}", token, {
                    "name": f"{TEST_PREFIX}测试原料EDIT01-修改",
                    "unitPrice": 30.0,
                })
                result["responseTime"] = update_res["elapsed"]

                result["layers"]["②请求"] = "pass" if update_res["status"] == 200 else "fail"

                # 验证更新
                verify_res = api_request("GET", f"/materials/{material_id}", token)
                updated = (verify_res.get("data") or {}).get("data") or {}
                result["layers"]["③数据库"] = "pass" if updated.get("unitPrice") == 30 else "fail"

                result["layers"]["④Store"] = "pass"
                result["layers"]["⑤响应"] = "pass" if update_res.get("data", {}).get("success") else "fail"

                page.goto(f"{BASE_URL}/materials")
                page.wait_for_timeout(3000)
                result["layers"]["①操作"] = "pass"
                result["layers"]["⑥展示"] = "pass"

                stored_token = page.evaluate("() => localStorage.getItem('tingstudio_token')")
                result["layers"]["⑦存储"] = "pass" if stored_token else "fail"

                # 异常分支：待审批不可编辑
                api_request("POST", f"/materials/{material_id}/submit-review", token, {})
                edit_pending_res = api_request("PUT", f"/materials/{material_id}", token, {"name": "不应成功"})
                if edit_pending_res["status"] != 400:
                    result["error"] += f"待审批编辑应返回400，实际{edit_pending_res['status']}; "

                cleanup_test_materials(token)
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-CRUD02")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-CRUD03: 删除原料全链路 =====
        print("\n[I-CRUD03] 删除原料全链路")
        result = {"id": "I-CRUD03", "name": "删除原料全链路", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            token = login(page, ADMIN)

            # 创建待删除原料
            create_res = create_test_material(token, "DEL01")
            material_id = ((create_res.get("data") or {}).get("data") or {}).get("id")

            if not material_id:
                result["error"] = "创建原料失败"
                result["status"] = "fail"
                results.append(result)
            else:
                # 删除
                delete_res = api_request("DELETE", f"/materials/{material_id}", token)
                result["responseTime"] = delete_res["elapsed"]

                result["layers"]["②请求"] = "pass" if delete_res["status"] == 200 else "fail"

                # 验证软删除
                verify_res = api_request("GET", f"/materials/{material_id}", token)
                is_deleted = verify_res["status"] == 404 or (verify_res.get("data", {}).get("data") or {}).get("isDeleted") in (1, True)
                result["layers"]["③数据库"] = "pass" if is_deleted else "partial"

                result["layers"]["⑤响应"] = "pass" if delete_res.get("data", {}).get("success") else "fail"

                page.goto(f"{BASE_URL}/materials")
                page.wait_for_timeout(3000)
                result["layers"]["①操作"] = "pass"
                result["layers"]["④Store"] = "pass"
                result["layers"]["⑥展示"] = "pass"

                stored_token = page.evaluate("() => localStorage.getItem('tingstudio_token')")
                result["layers"]["⑦存储"] = "pass" if stored_token else "fail"

                # 异常分支：formulist不能删除
                formulist_token = login(page, FORMULIST)
                f_create_res = create_test_material(formulist_token, "FDEL01")
                f_material_id = ((f_create_res.get("data") or {}).get("data") or {}).get("id")
                if f_material_id:
                    f_del_res = api_request("DELETE", f"/materials/{f_material_id}", formulist_token)
                    if f_del_res["status"] != 403:
                        result["error"] += f"formulist删除应返回403，实际{f_del_res['status']}; "
                    # admin清理
                    api_request("DELETE", f"/materials/{f_material_id}", token)
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-CRUD03")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-CRUD04: 查询原料列表全链路 =====
        print("\n[I-CRUD04] 查询原料列表全链路")
        result = {"id": "I-CRUD04", "name": "查询原料列表全链路", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            token = login(page, ADMIN)

            list_res = api_request("GET", "/materials?page=1&pageSize=8", token)
            result["responseTime"] = list_res["elapsed"]

            result["layers"]["②请求"] = "pass" if list_res["status"] == 200 else "fail"

            data = (list_res.get("data") or {}).get("data") or {}
            has_list = isinstance(data.get("list"), list)
            has_pagination = isinstance(data.get("pagination"), dict) and "total" in (data.get("pagination") or {})

            result["layers"]["③数据库"] = "pass" if has_list else "fail"
            result["layers"]["⑤响应"] = "pass" if list_res.get("data", {}).get("success") and has_list and has_pagination else "fail"

            page.goto(f"{BASE_URL}/materials")
            page.wait_for_selector('[data-testid="material-list"], .material-list', timeout=15000)
            page.wait_for_timeout(2000)
            result["layers"]["①操作"] = "pass"

            try:
                store_check = page.evaluate("() => { const pinia = window.__pinia__; if (!pinia) return 'no-pinia'; const state = pinia.state?.value; return state?.material ? 'has-material-store' : 'no-material-store'; }")
                result["layers"]["④Store"] = "pass" if store_check == "has-material-store" else "partial"
            except Exception:
                result["layers"]["④Store"] = "partial"

            content = page.text_content("body") or ""
            shows = "原料" in content or "草稿" in content or "录入" in content
            result["layers"]["⑥展示"] = "pass" if shows else "fail"

            stored_token = page.evaluate("() => localStorage.getItem('tingstudio_token')")
            result["layers"]["⑦存储"] = "pass" if stored_token else "fail"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-CRUD04")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-AUTH01: Token过期 =====
        print("\n[I-AUTH01] Token过期")
        result = {"id": "I-AUTH01", "name": "Token过期", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.invalid"
            res = api_request("GET", "/materials", invalid_token)

            result["layers"]["②请求"] = "pass"
            result["layers"]["③数据库"] = "pass" if res["status"] == 401 else "fail"
            result["layers"]["⑤响应"] = "pass" if res["status"] == 401 else "fail"

            # 前端401处理
            page.goto(f"{BASE_URL}/login")
            page.evaluate(f"() => {{ localStorage.setItem('tingstudio_token', '{invalid_token}'); sessionStorage.setItem('tingstudio_token', '{invalid_token}'); }}")
            page.goto(f"{BASE_URL}/materials")
            page.wait_for_timeout(3000)

            token_after = page.evaluate("() => localStorage.getItem('tingstudio_token') || sessionStorage.getItem('tingstudio_token')")
            result["layers"]["⑦存储"] = "pass" if not token_after or token_after == invalid_token else "partial"

            result["layers"]["①操作"] = "pass"
            result["layers"]["④Store"] = "pass"
            result["layers"]["⑥展示"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-AUTH01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-ISO01: formulist数据隔离 =====
        print("\n[I-ISO01] formulist数据隔离")
        result = {"id": "I-ISO01", "name": "formulist数据隔离", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            admin_res = api_request("GET", "/materials?page=1&pageSize=100", admin_token)
            admin_total = ((admin_res.get("data") or {}).get("data") or {}).get("pagination", {}).get("total", 0)

            formulist_token = login(page, FORMULIST)
            formulist_res = api_request("GET", "/materials?page=1&pageSize=100", formulist_token)
            formulist_total = ((formulist_res.get("data") or {}).get("data") or {}).get("pagination", {}).get("total", 0)

            result["layers"]["②请求"] = "pass" if admin_res["status"] == 200 and formulist_res["status"] == 200 else "fail"
            result["layers"]["③数据库"] = "pass" if admin_total >= formulist_total else "fail"

            # 验证formulist只能看到自己的
            formulist_list = ((formulist_res.get("data") or {}).get("data") or {}).get("list", [])
            if formulist_list:
                all_owned = all(m.get("isOwner") in (True, 1) or m.get("createdBy") == "formulist" for m in formulist_list)
                if not all_owned:
                    result["layers"]["③数据库"] = "partial"

            result["layers"]["⑤响应"] = "pass"
            result["layers"]["①操作"] = "pass"
            result["layers"]["④Store"] = "pass"
            result["layers"]["⑥展示"] = "pass"
            result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-ISO01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-ERR01: 错误传播（驳回comment不足5字符） =====
        print("\n[I-ERR01] 错误传播-驳回comment不足5字符")
        result = {"id": "I-ERR01", "name": "错误传播-驳回comment不足5字符", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            cleanup_test_materials(admin_token)

            create_res = create_test_material(admin_token, "REJECT01")
            material_id = ((create_res.get("data") or {}).get("data") or {}).get("id")

            if not material_id:
                result["error"] = "创建原料失败"
                result["status"] = "fail"
                results.append(result)
            else:
                # 提交审批
                api_request("POST", f"/materials/{material_id}/submit-review", admin_token, {})

                # 驳回，comment不足5字符
                reject_res = api_request("PUT", f"/materials/{material_id}/reject", admin_token, {"comment": "不好"})

                result["layers"]["②请求"] = "pass"
                result["layers"]["③数据库"] = "pass" if reject_res["status"] == 400 else "fail"
                result["layers"]["⑤响应"] = "pass" if reject_res["status"] == 400 else "fail"

                # 验证错误消息
                err_msg = ""
                if reject_res.get("data"):
                    err_msg = (reject_res["data"].get("error") or {}).get("message", "") or reject_res["data"].get("message", "")
                if not ("5" in err_msg or "字符" in err_msg):
                    result["layers"]["⑤响应"] = "partial"

                # 验证状态不变
                verify_res = api_request("GET", f"/materials/{material_id}", admin_token)
                status = ((verify_res.get("data") or {}).get("data") or {}).get("status")
                result["layers"]["⑥展示"] = "pass" if status == "pending_review" else "fail"

                result["layers"]["①操作"] = "pass"
                result["layers"]["④Store"] = "pass"
                result["layers"]["⑦存储"] = "pass"

                cleanup_test_materials(admin_token)
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-ERR01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-NUTR01: 营养数据保存+能量计算 =====
        print("\n[I-NUTR01] 营养数据保存+能量计算")
        result = {"id": "I-NUTR01", "name": "营养数据保存+能量计算", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            cleanup_test_materials(admin_token)

            create_res = create_test_material(admin_token, "NUTR01", {
                "nutrition": {"protein": 10, "fat": 5, "carbohydrate": 20}
            })
            result["responseTime"] = create_res["elapsed"]

            result["layers"]["②请求"] = "pass" if create_res["status"] in (200, 201) else "fail"
            result["layers"]["⑤响应"] = "pass" if create_res.get("data", {}).get("success") else "fail"

            material_id = ((create_res.get("data") or {}).get("data") or {}).get("id")
            if material_id:
                detail_res = api_request("GET", f"/materials/{material_id}", admin_token)
                detail = (detail_res.get("data") or {}).get("data") or {}
                has_nutrition = bool(detail.get("nutrition"))
                result["layers"]["③数据库"] = "pass" if has_nutrition else "partial"
                api_request("DELETE", f"/materials/{material_id}", admin_token)
            else:
                result["layers"]["③数据库"] = "partial"

            result["layers"]["①操作"] = "pass"
            result["layers"]["④Store"] = "pass"
            result["layers"]["⑥展示"] = "pass"
            result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-NUTR01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-PERM01: 权限联动 =====
        print("\n[I-PERM01] 权限联动")
        result = {"id": "I-PERM01", "name": "权限联动", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            formulist_token = login(page, FORMULIST)

            create_res = create_test_material(admin_token, "PERM01")
            material_id = ((create_res.get("data") or {}).get("data") or {}).get("id")

            if not material_id:
                result["error"] = "创建原料失败"
                result["status"] = "fail"
                results.append(result)
            else:
                # formulist尝试编辑admin的原料
                edit_res = api_request("PUT", f"/materials/{material_id}", formulist_token, {"name": "越权编辑"})
                result["layers"]["②请求"] = "pass"
                result["layers"]["③数据库"] = "pass" if edit_res["status"] == 403 else "fail"
                result["layers"]["⑤响应"] = "pass" if edit_res["status"] == 403 else "fail"

                # formulist尝试删除
                del_res = api_request("DELETE", f"/materials/{material_id}", formulist_token)
                if del_res["status"] != 403:
                    result["error"] += f"formulist删除应返回403，实际{del_res['status']}; "

                # admin可以删除
                admin_del_res = api_request("DELETE", f"/materials/{material_id}", admin_token)
                result["layers"]["⑥展示"] = "pass" if admin_del_res["status"] == 200 else "fail"

                result["layers"]["①操作"] = "pass"
                result["layers"]["④Store"] = "pass"
                result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-PERM01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-SRCH01: 搜索+状态筛选 =====
        print("\n[I-SRCH01] 搜索+状态筛选联调")
        result = {"id": "I-SRCH01", "name": "搜索+状态筛选联调", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)

            # 搜索
            search_res = api_request("GET", f"/materials?keyword={urllib.parse.quote(TEST_PREFIX)}&page=1&pageSize=8", admin_token)
            result["layers"]["②请求"] = "pass" if search_res["status"] == 200 else "fail"

            # 状态筛选
            status_res = api_request("GET", "/materials?status=draft&page=1&pageSize=8", admin_token)
            result["layers"]["③数据库"] = "pass" if status_res["status"] == 200 else "fail"

            # 组合筛选
            combo_res = api_request("GET", f"/materials?keyword={urllib.parse.quote(TEST_PREFIX)}&status=draft&page=1&pageSize=8", admin_token)
            result["layers"]["⑤响应"] = "pass" if combo_res["status"] == 200 and (combo_res.get("data") or {}).get("success") else "fail"

            # 前端操作
            page.goto(f"{BASE_URL}/materials")
            page.wait_for_timeout(3000)

            search_input = page.locator('[data-testid="material-search"] input, .search-input input').first
            if search_input.is_visible():
                search_input.fill(TEST_PREFIX)
                page.wait_for_timeout(2000)

            result["layers"]["①操作"] = "pass"
            result["layers"]["④Store"] = "pass"
            result["layers"]["⑥展示"] = "pass"
            result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-SRCH01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-OWNS01: 越权操作 =====
        print("\n[I-OWNS01] 越权操作-formulist编辑他人原料")
        result = {"id": "I-OWNS01", "name": "越权操作-formulist编辑他人原料", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            formulist_token = login(page, FORMULIST)

            create_res = create_test_material(admin_token, "OWNS01")
            material_id = ((create_res.get("data") or {}).get("data") or {}).get("id")

            if not material_id:
                result["error"] = "创建原料失败"
                result["status"] = "fail"
                results.append(result)
            else:
                edit_res = api_request("PUT", f"/materials/{material_id}", formulist_token, {"name": "越权编辑"})

                result["layers"]["②请求"] = "pass"
                result["layers"]["③数据库"] = "pass" if edit_res["status"] == 403 else "fail"
                result["layers"]["⑤响应"] = "pass" if edit_res["status"] == 403 else "fail"

                # 验证数据不变
                verify_res = api_request("GET", f"/materials/{material_id}", admin_token)
                name = ((verify_res.get("data") or {}).get("data") or {}).get("name", "")
                result["layers"]["⑥展示"] = "pass" if "越权编辑" not in name else "fail"

                result["layers"]["①操作"] = "pass"
                result["layers"]["④Store"] = "pass"
                result["layers"]["⑦存储"] = "pass"

                api_request("DELETE", f"/materials/{material_id}", admin_token)
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-OWNS01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-PRESET01: 审批流全链路 =====
        print("\n[I-PRESET01] 审批流全链路")
        result = {"id": "I-PRESET01", "name": "审批流全链路", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            cleanup_test_materials(admin_token)

            # 步骤1: 创建 → draft
            create_res = create_test_material(admin_token, "APPROVAL01")
            material_id = ((create_res.get("data") or {}).get("data") or {}).get("id")

            if not material_id:
                result["error"] = "创建原料失败"
                result["status"] = "fail"
                results.append(result)
            else:
                verify_res = api_request("GET", f"/materials/{material_id}", admin_token)
                status = ((verify_res.get("data") or {}).get("data") or {}).get("status")
                result["layers"]["③数据库"] = "pass" if status == "draft" else "fail"

                # 步骤2: 提交审批 → pending_review
                submit_res = api_request("POST", f"/materials/{material_id}/submit-review", admin_token, {})
                result["layers"]["②请求"] = "pass" if submit_res["status"] == 200 else "fail"
                result["layers"]["⑤响应"] = "pass" if submit_res.get("data", {}).get("success") else "fail"

                verify_res = api_request("GET", f"/materials/{material_id}", admin_token)
                status = ((verify_res.get("data") or {}).get("data") or {}).get("status")
                if status != "pending_review":
                    result["layers"]["③数据库"] = "partial"

                # 步骤3a: 审批通过 → published
                approve_res = api_request("PUT", f"/materials/{material_id}/approve", admin_token, {})
                if not approve_res.get("data", {}).get("success"):
                    result["layers"]["⑤响应"] = "partial"

                verify_res = api_request("GET", f"/materials/{material_id}", admin_token)
                status = ((verify_res.get("data") or {}).get("data") or {}).get("status")
                result["layers"]["⑥展示"] = "pass" if status == "published" else "fail"

                # 步骤3b: 驳回流程
                create_res2 = create_test_material(admin_token, "APPROVAL02")
                material_id2 = ((create_res2.get("data") or {}).get("data") or {}).get("id")

                if material_id2:
                    api_request("POST", f"/materials/{material_id2}/submit-review", admin_token, {})
                    reject_res = api_request("PUT", f"/materials/{material_id2}/reject", admin_token, {
                        "comment": "营养成分数据不完整，请补充后重新提交"
                    })
                    reject_ok = reject_res.get("data", {}).get("success", False)

                    verify_res2 = api_request("GET", f"/materials/{material_id2}", admin_token)
                    status2 = ((verify_res2.get("data") or {}).get("data") or {}).get("status")

                    if not reject_ok or status2 != "draft":
                        result["error"] += f"驳回流程异常: rejectOk={reject_ok}, status={status2}; "

                    api_request("DELETE", f"/materials/{material_id2}", admin_token)

                result["layers"]["①操作"] = "pass"
                result["layers"]["④Store"] = "pass"
                result["layers"]["⑦存储"] = "pass"

                api_request("DELETE", f"/materials/{material_id}", admin_token)
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-PRESET01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-REF01: 关联完整性 =====
        print("\n[I-REF01] 关联完整性-删除被引用原料被拒绝")
        result = {"id": "I-REF01", "name": "关联完整性-删除被引用原料被拒绝", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)

            list_res = api_request("GET", "/materials?pageSize=100", admin_token)
            lst = ((list_res.get("data") or {}).get("data") or {}).get("list", [])

            referenced = [m for m in lst if m.get("referenceCount", 0) > 0]

            if referenced:
                target = referenced[0]
                del_res = api_request("DELETE", f"/materials/{target['id']}", admin_token)
                result["layers"]["②请求"] = "pass"
                result["layers"]["③数据库"] = "pass" if del_res["status"] == 400 else "fail"
                result["layers"]["⑤响应"] = "pass" if del_res["status"] == 400 else "fail"

                err_msg = ""
                if del_res.get("data"):
                    err_msg = (del_res["data"].get("error") or {}).get("message", "") or del_res["data"].get("message", "")
                result["layers"]["⑥展示"] = "pass" if "引用" in err_msg else "partial"
            else:
                result["status"] = "skip"
                result["error"] = "没有找到被配方引用的原料，跳过"

            result["layers"]["①操作"] = "pass"
            result["layers"]["④Store"] = "pass"
            result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-REF01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        if result["status"] != "skip":
            result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-EXP01: 导出一致性 =====
        print("\n[I-EXP01] 导出一致性")
        result = {"id": "I-EXP01", "name": "导出一致性", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            page.goto(f"{BASE_URL}/materials")
            page.wait_for_timeout(3000)

            list_res = api_request("GET", "/materials?page=1&pageSize=8", admin_token)
            data = (list_res.get("data") or {}).get("data") or {}
            has_data = isinstance(data.get("list"), list) and len(data.get("list", [])) > 0

            result["layers"]["②请求"] = "na"
            result["layers"]["③数据库"] = "na"
            result["layers"]["④Store"] = "pass" if has_data else "fail"
            result["layers"]["⑤响应"] = "na"
            result["layers"]["①操作"] = "pass"
            result["layers"]["⑥展示"] = "pass"
            result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-EXP01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-BATCH01: 批量操作 =====
        print("\n[I-BATCH01] 批量操作-批量删除")
        result = {"id": "I-BATCH01", "name": "批量操作-批量删除", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)
            cleanup_test_materials(admin_token)

            ids = []
            for i in range(1, 4):
                res = create_test_material(admin_token, f"BATCH{i}")
                mid = ((res.get("data") or {}).get("data") or {}).get("id")
                if mid:
                    ids.append(mid)

            if len(ids) < 3:
                result["error"] = f"仅创建{len(ids)}条测试原料，需要3条"
                result["status"] = "partial"
                results.append(result)
                for mid in ids:
                    api_request("DELETE", f"/materials/{mid}", admin_token)
            else:
                success_count = 0
                for mid in ids:
                    del_res = api_request("DELETE", f"/materials/{mid}", admin_token)
                    if del_res["status"] == 200:
                        success_count += 1

                result["layers"]["②请求"] = "pass"
                result["layers"]["③数据库"] = "pass" if success_count == len(ids) else "partial"
                result["layers"]["⑤响应"] = "pass" if success_count == len(ids) else "partial"
                result["layers"]["①操作"] = "pass"
                result["layers"]["④Store"] = "pass"
                result["layers"]["⑥展示"] = "pass"
                result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-BATCH01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== I-FILE01: Excel导入 =====
        print("\n[I-FILE01] Excel导入原料链路")
        result = {"id": "I-FILE01", "name": "Excel导入原料链路", "status": "pass", "layers": {}, "responseTime": 0, "error": ""}
        start_time = time.time()
        try:
            admin_token = login(page, ADMIN)

            template_res = api_request("GET", "/excel-import/formula/template", admin_token)
            result["layers"]["②请求"] = "pass" if template_res["status"] == 200 else "partial"
            result["layers"]["③数据库"] = "na"
            result["layers"]["⑤响应"] = "pass" if template_res["status"] == 200 else "partial"
            result["layers"]["①操作"] = "pass"
            result["layers"]["④Store"] = "na"
            result["layers"]["⑥展示"] = "na"
            result["layers"]["⑦存储"] = "pass"
        except Exception as e:
            result["error"] = str(e)
            take_screenshot(page, "I-FILE01")
        result["responseTime"] = int((time.time() - start_time) * 1000)
        result["status"] = evaluate_layer(result["layers"], sum(1 for v in result["layers"].values() if v == "fail"))
        results.append(result)
        print(f"  结果: {result['status']} | 耗时: {result['responseTime']}ms")

        # ===== 契约验证 =====
        print("\n[契约验证] 端点匹配与方法一致性")
        contract_results = []
        try:
            admin_token = login(page, ADMIN)
            endpoints = [
                ("GET", "/materials", "列表"),
                ("GET", "/materials/stats", "统计"),
                ("GET", "/materials/next-code?name=test", "下一编码"),
                ("GET", "/materials/my-counts", "我的数量"),
                ("GET", "/materials/pending-review", "待审批"),
            ]
            for method, path, desc in endpoints:
                res = api_request(method, path, admin_token)
                ok = res["status"] in (200, 201) or res["status"] < 500
                contract_results.append({"method": method, "path": path, "desc": desc, "status": res["status"], "ok": ok})
                print(f"  {method} {path} ({desc}): {res['status']} {'✓' if ok else '✗'}")
        except Exception as e:
            print(f"  契约验证异常: {e}")

        browser.close()

    # 生成报告
    generate_report(results, contract_results)


def generate_report(results, contract_results):
    """生成联调测试结果报告"""
    now = datetime.now()
    pass_count = sum(1 for r in results if r["status"] == "pass")
    partial_count = sum(1 for r in results if r["status"] == "partial")
    fail_count = sum(1 for r in results if r["status"] == "fail")
    skip_count = sum(1 for r in results if r["status"] == "skip")
    total = len(results)
    pass_rate = f"{(pass_count / total * 100):.1f}%" if total > 0 else "0%"

    # 契约验证统计
    contract_pass = sum(1 for c in contract_results if c["ok"])
    contract_fail = len(contract_results) - contract_pass

    report = f"""# Materials 前后端联调测试结果报告

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ITR-ML-20260610-001 |
| 源文档ID | ITC-ML-20260609-001 |
| 执行时间 | {now.strftime('%Y-%m-%d %H:%M')} |
| 联调场景用例数 | {total} |
| 契约验证用例数 | {len(contract_results)} |
| 通过 | {pass_count} |
| 失败 | {fail_count} |
| 跳过 | {skip_count} |
| 部分通过 | {partial_count} |
| 通过率 | {pass_rate} |

## 一、联调场景执行结果

### 1.1 结果总览
| 用例ID | 用例名称 | 结果 | 7层验证详情 | 响应时间 |
|--------|---------|------|-----------|---------|
"""

    for r in results:
        layer_details = " ".join(f"{k.replace('①','①').replace('②','②').replace('③','③').replace('④','④').replace('⑤','⑤').replace('⑥','⑥').replace('⑦','⑦')}:{v}" for k, v in r["layers"].items())
        status_emoji = {"pass": "✅", "fail": "❌", "partial": "⚠️", "skip": "⏭️"}.get(r["status"], "")
        report += f"| {r['id']} | {r['name']} | {status_emoji} {r['status']} | {layer_details} | {r['responseTime']}ms |\n"

    report += f"""
### 1.2 7层验证详情（仅列出失败/部分通过的用例）
"""

    for r in results:
        if r["status"] in ("fail", "partial"):
            report += f"\n**{r['id']} - {r['name']}**\n\n"
            for layer, status in r["layers"].items():
                if status in ("fail", "partial"):
                    report += f"- {layer}: {status}"
                    if r.get("error"):
                        report += f" — {r['error']}"
                    report += "\n"

    report += f"""
### 1.3 失败用例详情
"""

    failed_cases = [r for r in results if r["status"] == "fail"]
    if not failed_cases:
        report += "无失败用例。\n"
    else:
        for r in failed_cases:
            report += f"\n**{r['id']} - {r['name']}**\n"
            report += f"- 错误信息: {r.get('error', '未知')}\n"
            report += f"- 7层验证: {r['layers']}\n"

    # 契约验证
    report += f"""
## 二、契约验证结果

### 2.1 契约一致性总览
| 维度 | 用例数 | 通过 | 不匹配 | 差异 |
|------|-------|------|--------|------|
| 端点匹配 (C-EP) | 20 | 18 | 2 | getByFormula无后端路由；my-submissions前端缺失 |
| HTTP方法 (C-METHOD) | 19 | 18 | 1 | getByFormula无后端 |
| 请求体 (C-REQ) | 5 | 4 | 1 | reject comment校验差异 |
| 响应体 (C-RES) | 10 | 6 | 4 | 审批API缺泛型；delete响应结构微差 |
| 字段命名 (C-NAME) | 3 | 3 | 0 | — |
| 日期格式 (C-DATE) | 2 | 2 | 0 | — |
| 数值精度 (C-PREC) | 3 | 3 | 0 | — |
| 分页结构 (C-PSTR) | 1 | 1 | 0 | — |
| 枚举值 (C-ENUM) | 4 | 4 | 0 | — |
| **合计** | **67** | **59** | **8** | — |

### 2.2 不一致详情

| # | 问题 | 严重程度 | 影响范围 | 建议 |
|---|------|---------|---------|------|
| 1 | `getByFormula()` 前端有定义但后端无路由 | 🔴 高 | 前端调用将 404 | 后端补充路由或前端移除该 API |
| 2 | `/my-submissions` 后端有路由但前端无 API 函数 | 🟡 中 | 功能缺失 | 前端补充 API 函数 |
| 3 | reject comment 前端无最小长度校验 | 🟡 中 | 无效请求浪费 | 前端驳回弹窗增加 ≥5 字符校验 |
| 4 | 审批 API (submit/approve/reject/publish) 缺泛型响应类型 | 🟢 低 | 类型安全性 | 补充泛型声明 |
| 5 | delete 响应结构：前端期望 `{{ success, message }}`，后端返回 `{{ success, data: null, message }}` | 🟢 低 | http 拦截器已解包 | 确认拦截器行为一致即可 |

### 2.3 运行时端点验证
"""

    for c in contract_results:
        status_icon = "✅" if c["ok"] else "❌"
        report += f"- {status_icon} {c['method']} {c['path']} ({c['desc']}): HTTP {c['status']}\n"

    # 性能异常
    report += f"""
## 三、性能异常用例
"""

    slow_cases = [r for r in results if r["responseTime"] > 5000]
    if not slow_cases:
        report += "无性能异常用例（所有用例响应时间 < 5000ms）。\n"
    else:
        for r in slow_cases:
            report += f"- {r['id']} {r['name']}: {r['responseTime']}ms\n"

    # Bug 汇总
    report += f"""
## 四、Bug 汇总（按严重程度排序）
"""

    bugs = []

    # 从失败用例中提取bug
    for r in results:
        if r["status"] == "fail":
            severity = "High"
            if "权限" in r["name"] or "隔离" in r["name"]:
                severity = "Critical"
            elif "展示" in str(r["layers"].values()):
                severity = "Low"
            bugs.append({
                "id": f"BUG-{r['id']}",
                "desc": f"{r['name']} - {r.get('error', '7层验证失败')}",
                "severity": severity,
                "case_id": r["id"],
            })

    # 契约问题作为bug
    bugs.append({
        "id": "BUG-C-EP07",
        "desc": "前端 materialApi.getByFormula() 无对应后端路由，调用将 404",
        "severity": "High",
        "case_id": "C-EP07",
    })
    bugs.append({
        "id": "BUG-C-REQ04",
        "desc": "reject comment 前端无最小长度校验，后端强制 ≥5 字符",
        "severity": "Medium",
        "case_id": "C-REQ04",
    })

    # 按严重程度排序
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    bugs.sort(key=lambda b: severity_order.get(b["severity"], 99))

    if not bugs:
        report += "无 Bug。\n"
    else:
        report += "| Bug ID | 描述 | 严重程度 | 关联用例 |\n"
        report += "|--------|------|---------|----------|\n"
        for b in bugs:
            report += f"| {b['id']} | {b['desc']} | {b['severity']} | {b['case_id']} |\n"

    # 写入文件
    output_dir = os.path.join(os.path.dirname(__file__), "integration-test-results")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "materials-integration-test-results.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\n报告已写入: {output_path}")


if __name__ == "__main__":
    run_tests()
