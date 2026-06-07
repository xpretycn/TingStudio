// 认证控制器
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { query, adaptSQL, getDatabaseType } from "../config/database-adapter.js";
import { generateId, now, success, rowToCamelCase } from "../utils/helpers.js";
import { generateToken } from "../middleware/auth.js";

const NICKNAME_PREFIXES = ["小", "阿", "大", "老"];
const NICKNAME_SUFFIXES = ["明", "华", "强", "伟", "芳", "娜", "敏", "静", "磊", "洋", "勇", "军", "杰", "涛", "超", "丽", "艳", "燕", "玲", "莉", "鑫", "宇", "浩", "晨", "瑶", "琳", "萱", "涵", "博", "翔"];

function generateRandomNickname(): string {
  const prefix = NICKNAME_PREFIXES[Math.floor(Math.random() * NICKNAME_PREFIXES.length)];
  const suffix = NICKNAME_SUFFIXES[Math.floor(Math.random() * NICKNAME_SUFFIXES.length)];
  return `${prefix}${suffix}${Math.floor(Math.random() * 900 + 100)}`;
}

function generateRandomEmail(username: string): string {
  const domains = ["tingstudio.com", "example.com", "mail.com"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${username}@${domain}`;
}

function generateRandomPhone(): string {
  const prefixes = ["130", "131", "132", "133", "135", "136", "137", "138", "139", "150", "151", "152", "153", "155", "156", "157", "158", "159", "170", "176", "177", "178", "180", "181", "182", "183", "184", "185", "186", "187", "188", "189"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
  return `${prefix}${suffix}`;
}

/** 用户注册 */
export async function register(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    const existingResult = await query(adaptSQL("SELECT id FROM users WHERE username = ?"), [username]);
    if (existingResult.rows.length > 0) {
      res.status(409).json({ success: false, message: "用户名已存在" });
      return;
    }

    const userId = generateId();
    const hashedPassword = await bcrypt.hash(password, 10);
    const displayName = generateRandomNickname();
    const email = generateRandomEmail(username);
    const phone = generateRandomPhone();
    const currentTime = now();

    await query(
      adaptSQL("INSERT INTO users (id, username, password, role, display_name, email, phone, created_at, updated_at) VALUES (?, ?, ?, 'formulist', ?, ?, ?, ?, ?)"),
      [userId, username, hashedPassword, displayName, email, phone, currentTime, currentTime],
    );

    const token = await generateToken({ userId, username, role: "formulist" });
    const userRow = {
      id: userId,
      username,
      role: "formulist",
      display_name: displayName,
      avatar: null,
      bio: null,
      email,
      phone,
      created_at: currentTime,
    };
    res.status(201).json(
      success(
        {
          user: rowToCamelCase(userRow),
          token,
        },
        "注册成功",
      ),
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: "注册失败", error: error.message });
  }
}

/** 用户登录 */
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    const userResult = await query(
      adaptSQL(
        "SELECT id, username, password, role, role_id, display_name, avatar, bio, email, phone, created_at FROM users WHERE username = ?",
      ),
      [username],
    );
    const user = userResult.rows[0];
    if (!user) {
      res.status(401).json({ success: false, message: "用户名或密码错误" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ success: false, message: "用户名或密码错误" });
      return;
    }

    const token = await generateToken({ userId: user.id, username: user.username, role: user.role, roleId: user.role_id || undefined });
    const { password: _, ...userWithoutPassword } = rowToCamelCase(user);

    res.json(
      success(
        {
          user: userWithoutPassword,
          token,
        },
        "登录成功",
      ),
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: "登录失败", error: error.message });
  }
}

/** 获取当前用户信息 */
export async function getCurrentUser(req: any, res: Response) {
  try {
    const userResult = await query(
      adaptSQL(
        "SELECT id, username, role, display_name, avatar, bio, email, phone, created_at FROM users WHERE id = ?",
      ),
      [req.user.userId],
    );
    const user = userResult.rows[0];
    if (!user) {
      res.status(404).json({ success: false, message: "用户不存在" });
      return;
    }
    res.json(success(rowToCamelCase(user)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取用户信息失败", error: error.message });
  }
}

/** 更新个人资料 */
export async function updateProfile(req: any, res: Response) {
  try {
    const userId = req.user.userId;
    const { display_name, avatar, bio, email, phone } = req.body;

    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: "邮箱格式不正确" });
      return;
    }

    // 验证手机号格式
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      res.status(400).json({ success: false, message: "手机号格式不正确" });
      return;
    }

    // 检查邮箱唯一性（排除自己）
    if (email) {
      const existingEmailResult = await query(adaptSQL("SELECT id FROM users WHERE email = ? AND id != ?"), [
        email,
        userId,
      ]);
      if (existingEmailResult.rows.length > 0) {
        res.status(409).json({ success: false, message: "该邮箱已被其他账号绑定" });
        return;
      }
    }

    // 检查手机号唯一性（排除自己）
    if (phone) {
      const existingPhoneResult = await query(adaptSQL("SELECT id FROM users WHERE phone = ? AND id != ?"), [
        phone,
        userId,
      ]);
      if (existingPhoneResult.rows.length > 0) {
        res.status(409).json({ success: false, message: "该手机号已被其他账号绑定" });
        return;
      }
    }

    await query(
      adaptSQL(
        `UPDATE users SET display_name = ?, avatar = ?, bio = ?, email = ?, phone = ?, updated_at = ? WHERE id = ?`,
      ),
      [display_name || null, avatar || null, bio || null, email || null, phone || null, now(), userId],
    );

    // 返回更新后的用户信息
    const updatedUserResult = await query(
      adaptSQL(
        "SELECT id, username, role, display_name, avatar, bio, email, phone, created_at FROM users WHERE id = ?",
      ),
      [userId],
    );
    const updatedUser = updatedUserResult.rows[0];
    res.json(success(rowToCamelCase(updatedUser), "资料更新成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新资料失败", error: error.message });
  }
}

/** 修改密码 */
export async function changePassword(req: any, res: Response) {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, message: "请输入当前密码和新密码" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: "新密码长度至少6个字符" });
      return;
    }

    // 获取当前用户密码
    const userResult = await query(adaptSQL("SELECT password FROM users WHERE id = ?"), [userId]);
    const user = userResult.rows[0];
    if (!user) {
      res.status(404).json({ success: false, message: "用户不存在" });
      return;
    }

    // 验证旧密码
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      res.status(400).json({ success: false, message: "当前密码不正确" });
      return;
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(adaptSQL("UPDATE users SET password = ?, updated_at = ? WHERE id = ?"), [
      hashedPassword,
      now(),
      userId,
    ]);

    res.json(success(null, "密码修改成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "密码修改失败", error: error.message });
  }
}

export async function getPreferences(req: any, res: Response) {
  try {
    const userId = req.user.userId;
    const result = await query(
      adaptSQL("SELECT preferences_json FROM user_preferences WHERE user_id = ?"),
      [userId],
    );
    const row = result.rows[0];
    const preferences = row ? JSON.parse(row.preferences_json) : {};
    res.json(success(preferences));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取偏好设置失败", error: error.message });
  }
}

export async function updatePreferences(req: any, res: Response) {
  try {
    const userId = req.user.userId;
    const { preferences } = req.body;

    if (preferences === null || typeof preferences !== "object") {
      res.status(400).json({ success: false, message: "偏好数据格式不正确" });
      return;
    }

    const preferencesJson = JSON.stringify(preferences);
    const currentTime = now();
    const dbType = getDatabaseType();

    if (dbType === "mysql") {
      await query(
        "INSERT INTO user_preferences (user_id, preferences_json, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE preferences_json = ?, updated_at = ?",
        [userId, preferencesJson, currentTime, preferencesJson, currentTime],
      );
    } else {
      await query(
        "INSERT OR REPLACE INTO user_preferences (user_id, preferences_json, updated_at) VALUES (?, ?, ?)",
        [userId, preferencesJson, currentTime],
      );
    }

    res.json(success(preferences, "偏好设置已保存"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "保存偏好设置失败", error: error.message });
  }
}
