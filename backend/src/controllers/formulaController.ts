// 配方管理控制器
import { Request, Response } from "express";
import crypto from "crypto";
import { query } from "../config/database-better-sqlite3.js";
import {
  generateId,
  now,
  success,
  successWithPagination,
  buildPagination,
  buildLike,
  rowToCamelCase,
  rowsToCamelCase,
  generateFormulaCode,
} from "../utils/helpers.js";
import { validateRatioFactor, DEFAULT_THRESHOLDS } from "../services/ratioFactorValidator.js";

/** 获取配方列表 */
export async function getFormulas(req: any, res: Response) {
  try {
    const { keyword, salesmanId, page, pageSize } = req.query;
    const { page: p, pageSize: size, offset } = buildPagination(Number(page), Number(pageSize));
    const userId = req.user.userId;

    let whereParts: string[] = [];
    const params: any[] = [];

    if (keyword) {
      whereParts.push("(f.name LIKE ? OR f.salesman_name LIKE ?)");
      const like = buildLike(keyword as string);
      params.push(like, like);
    }
    if (salesmanId) {
      whereParts.push("f.salesman_id = ?");
      params.push(salesmanId);
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const [list]: any[] = await query(`SELECT f.*, COALESCE(u.display_name, u.username) as created_by_name, u.avatar as created_by_avatar FROM formulas f LEFT JOIN users u ON f.created_by = u.id ${whereSql} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`, [
      ...params,
      size,
      offset,
    ]);

    const [countResult]: any[] = await query(`SELECT COUNT(*) as total FROM formulas f ${whereSql}`, params);

    // 批量查询所有配方中原料的单价
    const allMaterialIds: string[] = [];
    for (const f of list) {
      try {
        const materials = JSON.parse(f.materials_json || "[]");
        for (const m of materials) {
          if (m.materialId) allMaterialIds.push(m.materialId);
        }
      } catch {
        /* ignore parse errors */
      }
    }
    let priceMap: Record<string, number> = {};
    if (allMaterialIds.length > 0) {
      const uniqueIds = [...new Set(allMaterialIds)];
      const pricePlaceholders = uniqueIds.map(() => "?").join(",");
      const [priceRows]: any[] = await query(
        `SELECT id, unit_price FROM materials WHERE id IN (${pricePlaceholders})`,
        uniqueIds,
      );
      for (const r of priceRows) {
        if (r.unit_price != null) {
          priceMap[r.id] = Number(r.unit_price);
        }
      }
    }

    // 批量查询每个配方的版本信息
    const formulaIds = list.map((f: any) => f.id);
    let versionsMap: Record<string, any[]> = {};
    if (formulaIds.length > 0) {
      const placeholders = formulaIds.map(() => "?").join(",");
      const [versions]: any[] = await query(
        `SELECT * FROM formula_versions WHERE formula_id IN (${placeholders}) ORDER BY created_at DESC`,
        formulaIds,
      );
      for (const v of versions) {
        const fid = v.formula_id;
        if (!versionsMap[fid]) versionsMap[fid] = [];
        versionsMap[fid].push(rowToCamelCase(v));
      }
    }

    const listWithVersions = rowsToCamelCase(list).map((f: any) => {
      let materialTotal = 0;
      const missingPrices: string[] = [];
      try {
        const materials = JSON.parse(f.materialsJson || "[]");
        for (const m of materials) {
          const unitPrice = m.adjustedPrice != null ? m.adjustedPrice : (priceMap[m.materialId] ?? null);
          if (unitPrice != null) {
            materialTotal += (m.quantity / 1000) * unitPrice;
          } else {
            missingPrices.push(m.materialName || m.materialId);
          }
        }
      } catch {
        /* ignore */
      }
      const packagingPrice = f.packagingPrice ?? 0;
      const otherPrice = f.otherPrice ?? 0;
      const profitMargin = f.profitMargin ?? 20;
      const costSubtotal = Number((materialTotal + packagingPrice + otherPrice).toFixed(4));
      const totalPrice = Number((costSubtotal * (1 + profitMargin / 100)).toFixed(4));
      return {
        ...f,
        costSubtotal: costSubtotal,
        totalPrice: totalPrice,
        missingPrices,
        versions: versionsMap[f.id] || [],
      };
    });

    const nowDate = new Date();
    const currentMonthStart = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonth = nowDate.getMonth() + 2;
    const nextYear = nextMonth > 12 ? nowDate.getFullYear() + 1 : nowDate.getFullYear();
    const nextMonthStr = nextMonth > 12 ? String(nextMonth - 12).padStart(2, "0") : String(nextMonth).padStart(2, "0");
    const currentMonthEnd = `${nextYear}-${nextMonthStr}-01`;

    let salesMap: Record<string, number> = {};
    if (formulaIds.length > 0) {
      const placeholders = formulaIds.map(() => "?").join(",");
      const [salesRows]: any[] = await query(
        `SELECT formula_id, SUM(quantity) as total_qty FROM formula_sales
         WHERE formula_id IN (${placeholders}) AND period_start >= ? AND period_start < ?
         GROUP BY formula_id`,
        [...formulaIds, currentMonthStart, currentMonthEnd],
      );
      for (const sr of salesRows) {
        salesMap[sr.formula_id] = sr.total_qty;
      }
    }

    const listWithSales = listWithVersions.map((f: any) => ({
      ...f,
      salesQuantity: salesMap[f.id] ?? 0,
    }));

    res.json(successWithPagination(listWithSales, countResult[0].total, p, size));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取配方列表失败", error: error.message });
  }
}

/** 获取单个配方 */
export async function getFormula(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [[formula]]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [id]);

    if (!formula) {
      res.status(404).json({ success: false, message: "配方不存在" });
      return;
    }

    const [[currentVer]]: any[][] = await query(
      "SELECT version_number FROM formula_versions WHERE formula_id = ? AND is_current = 1 LIMIT 1",
      [id]
    );

    res.json(success({
      ...rowToCamelCase(formula),
      currentVersionNumber: currentVer?.version_number || null,
    }));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取配方失败", error: error.message });
  }
}

/** 创建配方 */
export async function createFormula(req: any, res: Response) {
  try {
    const {
      name,
      salesmanId,
      materials,
      description,
      preparationMethod,
      finishedWeight,
      ratioFactor,
      supplementRatioFactor,
      packagingPrice,
      otherPrice,
      profitMargin,
      originalName,
      originalWeight,
      parseResultId,
    } = req.body;
    const userId = req.user.userId;
    const id = generateId();
    const code = generateFormulaCode(name);

    // 获取业务员信息
    const [[salesman]]: any[][] = await query("SELECT name FROM salesmen WHERE id = ?", [salesmanId]);
    if (!salesman) {
      res.status(400).json({ success: false, message: "业务员不存在" });
      return;
    }

    // 补充原料名称（ratioFactor 从原料表获取，不再从请求中传入）
    const materialItems = materials.map((m: any) => {
      const item: any = {
        materialId: m.materialId,
        materialName: m.materialName || "",
        quantity: m.quantity,
        materialType: m.materialType || "herb",
      };
      if (m.adjustedPrice != null) item.adjustedPrice = m.adjustedPrice;
      return item;
    });

    const supRatio = supplementRatioFactor ?? 1.0;

    // ratioFactor 含量比校验（创建时拦截）
    const ratioValidation = validateRatioFactor(
      materialItems,
      finishedWeight || 0,
      ratioFactor ?? 0.18,
      supRatio,
    );
    if (!ratioValidation.allowed) {
      res.status(400).json({
        success: false,
        message: ratioValidation.message,
        description: ratioValidation.description,
        validation: ratioValidation,
      });
      return;
    }

    await query(
      `INSERT INTO formulas (id, code, name, salesman_id, salesman_name, materials_json, finished_weight, ratio_factor, supplement_ratio_factor, packaging_price, other_price, profit_margin, description, preparation_method, original_name, original_weight, parse_result_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        code,
        name,
        salesmanId,
        salesman.name,
        JSON.stringify(materialItems),
        finishedWeight || 0,
        ratioFactor ?? 0.18,
        supRatio,
        packagingPrice ?? 0,
        otherPrice ?? 0,
        profitMargin ?? 20,
        description,
        preparationMethod || null,
        originalName || null,
        originalWeight != null ? originalWeight : null,
        parseResultId || null,
        userId,
        now(),
      ],
    );

    // 如果有关联的解析结果，更新解析记录的关联状态
    if (parseResultId) {
      try {
        await query(
          `UPDATE parse_results SET is_linked = 1, linked_formula_id = ?, updated_at = ? WHERE id = ?`,
          [id, now(), parseResultId]
        );
        console.log(`[Formula] 已关联解析记录: ${parseResultId} -> 配方: ${id}`);
      } catch (linkErr) {
        console.warn(`[Formula] 更新解析记录关联失败:`, linkErr);
      }
    }

    // 自动创建初始版本
    const versionId = generateId();

    // 查询当时原料库的基价，记录到快照中
    const matIds = materialItems.map((m: any) => m.materialId).filter(Boolean);
    let basePriceMap: Record<string, number> = {};
    if (matIds.length > 0) {
      const placeholders = matIds.map(() => "?").join(",");
      const [priceRows]: any[] = await query(
        `SELECT id, unit_price FROM materials WHERE id IN (${placeholders})`,
        matIds,
      );
      for (const r of priceRows) {
        if (r.unit_price != null) basePriceMap[r.id] = Number(r.unit_price);
      }
    }
    const snapshotMaterials = materialItems.map((m: any) => ({
      ...m,
      basePriceAtSave: basePriceMap[m.materialId] ?? null,
    }));

    const initialStatus = req.user.role === "admin" ? "published" : "draft";

    await query(
      `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, snapshot_json, status, is_current, ratio_factor, supplement_ratio_factor, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        versionId,
        id,
        "v1.0",
        `首次创建，含${materialItems.length}种原料`,
        JSON.stringify({
          code,
          name,
          salesmanId,
          salesmanName: salesman.name,
          materials: snapshotMaterials,
          finishedWeight,
          ratioFactor,
          supplementRatioFactor: supRatio,
          packagingPrice: packagingPrice ?? 0,
          otherPrice: otherPrice ?? 0,
          profitMargin: profitMargin ?? 20,
          description,
          preparationMethod: preparationMethod || null,
          formulaData: {
            code,
            name,
            salesmanId,
            materials,
            finishedWeight,
            ratioFactor,
            supplementRatioFactor: supRatio,
            packagingPrice: packagingPrice ?? 0,
            otherPrice: otherPrice ?? 0,
            profitMargin: profitMargin ?? 20,
            description,
            preparationMethod: preparationMethod || null,
          },
        }),
        initialStatus,
        ratioFactor ?? 0.18,
        supRatio,
        userId,
        now(),
      ],
    );

    const [[formula]]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [id]);
    res.status(201).json(success(rowToCamelCase(formula), "配方创建成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "创建配方失败", error: error.message });
  }
}

/** 更新配方 */
export async function updateFormula(req: any, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      salesmanId,
      materials,
      description,
      preparationMethod,
      finishedWeight,
      ratioFactor,
      supplementRatioFactor,
      versionReason,
      packagingPrice,
      otherPrice,
      profitMargin,
    } = req.body;
    const userId = req.user.userId;

    // 升版时必须填写升版原因
    if (materials && !versionReason?.trim()) {
      res.status(400).json({ success: false, message: "请填写升版原因" });
      return;
    }

    // 获取旧配方
    const [[oldFormula]]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [id]);
    if (!oldFormula) {
      res.status(404).json({ success: false, message: "配方不存在" });
      return;
    }

    let salesmanName = oldFormula.salesman_name;
    if (salesmanId && salesmanId !== oldFormula.salesman_id) {
      const [[salesman]]: any[][] = await query("SELECT name FROM salesmen WHERE id = ?", [salesmanId]);
      if (!salesman) {
        res.status(400).json({ success: false, message: "业务员不存在" });
        return;
      }
      salesmanName = salesman.name;
    }

    const materialItems = materials
      ? materials.map((m: any) => {
          const item: any = {
            materialId: m.materialId,
            materialName: m.materialName || "",
            quantity: m.quantity,
            materialType: m.materialType || "herb",
          };
          if (m.adjustedPrice != null) item.adjustedPrice = m.adjustedPrice;
          return item;
        })
      : oldFormula.materials_json;

    // ratioFactor 含量比校验（更新时拦截，仅当原料变更时）
    if (materials) {
      const ratioValidation = validateRatioFactor(
        materialItems,
        finishedWeight !== undefined ? finishedWeight : oldFormula.finished_weight,
        ratioFactor !== undefined ? ratioFactor : oldFormula.ratio_factor,
        supplementRatioFactor !== undefined ? supplementRatioFactor : oldFormula.supplement_ratio_factor,
      );
      if (!ratioValidation.allowed) {
        res.status(400).json({
          success: false,
          message: ratioValidation.message,
          description: ratioValidation.description,
          validation: ratioValidation,
        });
        return;
      }
    }

    await query(
      `UPDATE formulas SET name=?, salesman_id=?, salesman_name=?, materials_json=?, finished_weight=?, ratio_factor=?, supplement_ratio_factor=?, packaging_price=?, other_price=?, profit_margin=?, description=?, preparation_method=? WHERE id=?`,
      [
        name || oldFormula.name,
        salesmanId || oldFormula.salesman_id,
        salesmanName,
        JSON.stringify(materialItems),
        finishedWeight !== undefined ? finishedWeight : oldFormula.finished_weight,
        ratioFactor !== undefined ? ratioFactor : oldFormula.ratio_factor,
        supplementRatioFactor !== undefined ? supplementRatioFactor : oldFormula.supplement_ratio_factor,
        packagingPrice !== undefined ? packagingPrice : oldFormula.packaging_price,
        otherPrice !== undefined ? otherPrice : oldFormula.other_price,
        profitMargin !== undefined ? profitMargin : oldFormula.profit_margin,
        description !== undefined ? description : oldFormula.description,
        preparationMethod !== undefined ? preparationMethod : oldFormula.preparation_method,
        id,
      ],
    );

    // 创建新版本（如果材料有变更）
    if (materials) {
      // 将旧当前版本设为非当前
      await query("UPDATE formula_versions SET is_current = 0 WHERE formula_id = ?", [id]);

      // 获取最新版本号
      const [versions]: any[] = await query(
        `SELECT version_number FROM formula_versions WHERE formula_id = ? ORDER BY created_at DESC LIMIT 1`,
        [id],
      );

      const lastVersionNum = versions.length > 0 ? versions[0].version_number : "v0.0";
      const match = lastVersionNum.match(/v(\d+)\.(\d+)/);
      let newVersionNum = "v1.1";
      if (match) {
        newVersionNum = `v${match[1]}.${parseInt(match[2]) + 1}`;
      }

      const versionId = generateId();
      // 计算变更
      const oldMaterials = JSON.parse(oldFormula.materials_json || "[]");
      const changes = buildChanges(oldMaterials, materialItems, oldFormula, {
        name,
        salesmanId,
        salesmanName,
        finishedWeight,
        ratioFactor,
        supplementRatioFactor,
        description,
      });
      // 空变更存 null，避免前端误显示"查看变更"按钮后展示"暂无变更记录"
      const changesJsonStr = changes.length > 0 ? JSON.stringify(changes) : null;

      // 查询当时原料库的基价，记录到快照中（报价历史快照）
      const matIds = materialItems.map((m: any) => m.materialId).filter(Boolean);
      let basePriceMap: Record<string, number> = {};
      if (matIds.length > 0) {
        const placeholders = matIds.map(() => "?").join(",");
        const [priceRows]: any[] = await query(
          `SELECT id, unit_price FROM materials WHERE id IN (${placeholders})`,
          matIds,
        );
        for (const r of priceRows) {
          if (r.unit_price != null) basePriceMap[r.id] = Number(r.unit_price);
        }
      }
      const snapshotMaterials = materialItems.map((m: any) => ({
        ...m,
        basePriceAtSave: basePriceMap[m.materialId] ?? null,
      }));

      // 将旧的当前版本设为非当前（保留其原始状态，不归档）
      await query(`UPDATE formula_versions SET is_current = 0 WHERE formula_id = ? AND is_current = 1`, [id]);

      await query(
        `INSERT INTO formula_versions (version_id, formula_id, version_number, version_name, version_reason, changes_json, snapshot_json, status, is_current, ratio_factor, supplement_ratio_factor, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)`,
        [
          versionId,
          id,
          newVersionNum,
          buildVersionName(changes, materialItems.length),
          versionReason?.trim() || null,
          changesJsonStr,
          JSON.stringify({
            name: name || oldFormula.name,
            salesmanId: salesmanId || oldFormula.salesman_id,
            salesmanName,
            materials: snapshotMaterials,
            finishedWeight: finishedWeight !== undefined ? finishedWeight : oldFormula.finished_weight,
            ratioFactor: ratioFactor !== undefined ? ratioFactor : oldFormula.ratio_factor,
            supplementRatioFactor:
              supplementRatioFactor !== undefined ? supplementRatioFactor : oldFormula.supplement_ratio_factor,
            packagingPrice: packagingPrice !== undefined ? packagingPrice : oldFormula.packaging_price,
            otherPrice: otherPrice !== undefined ? otherPrice : oldFormula.other_price,
            profitMargin: profitMargin !== undefined ? profitMargin : oldFormula.profit_margin,
            description: description !== undefined ? description : oldFormula.description,
            preparationMethod: preparationMethod !== undefined ? preparationMethod : oldFormula.preparation_method,
            formulaData: {
              name,
              salesmanId,
              materials,
              finishedWeight,
              ratioFactor,
              supplementRatioFactor,
              packagingPrice: packagingPrice !== undefined ? packagingPrice : oldFormula.packaging_price,
              otherPrice: otherPrice !== undefined ? otherPrice : oldFormula.other_price,
              profitMargin: profitMargin !== undefined ? profitMargin : oldFormula.profit_margin,
              description,
              preparationMethod: preparationMethod || null,
            },
          }),
          ratioFactor !== undefined ? ratioFactor : oldFormula.ratio_factor,
          supplementRatioFactor !== undefined ? supplementRatioFactor : oldFormula.supplement_ratio_factor,
          userId,
          now(),
        ],
      );
    }

    const [[formula]]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [id]);
    res.json(success(rowToCamelCase(formula), "配方更新成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "更新配方失败", error: error.message });
  }
}

/** 删除配方 */
export async function deleteFormula(req: any, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const [[formula]]: any[][] = await query("SELECT id, created_by FROM formulas WHERE id = ?", [id]);
    if (!formula) {
      res.status(404).json({ success: false, message: "配方不存在" });
      return;
    }

    if (userRole !== "admin" && formula.created_by !== userId) {
      res.status(403).json({ success: false, message: "无权删除他人配方" });
      return;
    }

    await query("DELETE FROM formulas WHERE id = ?", [id]);
    res.json(success(null, "配方删除成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "删除配方失败", error: error.message });
  }
}

/** 发布配方（将当前草稿版本状态改为已发布） */
export async function publishFormula(req: any, res: Response) {
  try {
    const { id } = req.params;
    const [formulas]: any[] = await query("SELECT id FROM formulas WHERE id = ?", [id]);
    if (!formulas || formulas.length === 0) {
      res.status(404).json({ success: false, message: "配方不存在" });
      return;
    }
    const [versions]: any[] = await query(
      "SELECT version_id, status FROM formula_versions WHERE formula_id = ? AND is_current = 1",
      [id],
    );
    if (!versions || versions.length === 0) {
      res.status(400).json({ success: false, message: "配方没有当前版本" });
      return;
    }
    const currentVersion = versions[0];
    if (currentVersion.status === "published") {
      res.status(400).json({ success: false, message: "当前版本已发布，无需重复发布" });
      return;
    }
    await query(
      "UPDATE formula_versions SET status = 'published', updated_at = ? WHERE version_id = ?",
      [now(), currentVersion.version_id],
    );
    const [updated]: any[] = await query(
      "SELECT * FROM formula_versions WHERE version_id = ?",
      [currentVersion.version_id],
    );
    res.json(success(rowToCamelCase(updated[0]), "配方发布成功"));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "发布配方失败", error: error.message });
  }
}

/** 根据原料查找配方 */
export async function getFormulasByMaterial(req: Request, res: Response) {
  try {
    const { materialId } = req.params;
    const [formulas]: any[] = await query(
      `SELECT * FROM formulas WHERE materials_json LIKE ? ORDER BY created_at DESC`,
      [`%"materialId":"${materialId}"%`],
    );
    res.json(success(rowsToCamelCase(formulas)));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "查询失败", error: error.message });
  }
}

/** 获取配方报价明细 */
export async function getPriceQuote(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const [[formula]]: any[][] = await query("SELECT * FROM formulas WHERE id = ?", [id]);
    if (!formula) {
      res.status(404).json({ success: false, message: "配方不存在" });
      return;
    }

    const materials = JSON.parse(formula.materials_json || "[]");
    const materialIds = materials.map((m: any) => m.materialId).filter(Boolean);

    let priceMap: Record<string, number> = {};
    if (materialIds.length > 0) {
      const placeholders = materialIds.map(() => "?").join(",");
      const [rows]: any[] = await query(
        `SELECT id, unit_price FROM materials WHERE id IN (${placeholders})`,
        materialIds,
      );
      for (const r of rows) {
        if (r.unit_price != null) {
          priceMap[r.id] = Number(r.unit_price);
        }
      }
    }

    const packagingPrice = formula.packaging_price ?? 0;
    const otherPrice = formula.other_price ?? 0;
    const profitMargin = formula.profit_margin ?? 20;

    const materialDetails = materials.map((m: any) => {
      const basePrice = priceMap[m.materialId] ?? null;
      const unitPrice = m.adjustedPrice != null ? m.adjustedPrice : basePrice;
      const subtotal = unitPrice != null ? Number(((m.quantity / 1000) * unitPrice).toFixed(4)) : 0;
      return {
        materialId: m.materialId,
        materialName: m.materialName || "",
        quantity: m.quantity || 0,
        unitPrice,
        basePrice,
        isAdjusted: m.adjustedPrice != null && m.adjustedPrice !== basePrice,
        subtotal,
      };
    });

    const materialTotal = materialDetails.reduce((sum: number, m: any) => sum + (m.subtotal || 0), 0);
    const costSubtotal = Number((materialTotal + packagingPrice + otherPrice).toFixed(4));
    const totalPrice = Number((costSubtotal * (1 + profitMargin / 100)).toFixed(4));
    const missingPrices = materialDetails.filter((m: any) => m.unitPrice === null).map((m: any) => m.materialName);

    res.json(
      success({
        materials: materialDetails,
        materialTotal: Number(materialTotal.toFixed(4)),
        packagingPrice: Number(packagingPrice),
        otherPrice: Number(otherPrice),
        costSubtotal,
        profitMargin,
        totalPrice,
        missingPrices,
      }),
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: "获取报价失败", error: error.message });
  }
}

/** 构建变更记录 */
function buildChanges(oldMaterials: any[], newMaterials: any[], oldFormula: any, newFields: any) {
  const changes: any[] = [];

  // 配方名称变更
  if (newFields.name && newFields.name !== oldFormula.name) {
    changes.push({
      field: "name",
      fieldLabel: "配方名称",
      oldValue: oldFormula.name,
      newValue: newFields.name,
      changeType: "modify",
    });
  }

  // 业务员变更
  if (newFields.salesmanId && newFields.salesmanId !== oldFormula.salesman_id) {
    const oldSalesman = oldFormula.salesman_name || oldFormula.salesman_id;
    changes.push({
      field: "salesman",
      fieldLabel: "所属业务员",
      oldValue: oldSalesman,
      newValue: newFields.salesmanName || newFields.salesmanId,
      changeType: "modify",
    });
  }

  // 成品重量变更
  if (newFields.finishedWeight !== undefined && newFields.finishedWeight !== oldFormula.finished_weight) {
    changes.push({
      field: "finishedWeight",
      fieldLabel: "成品重量(g)",
      oldValue: oldFormula.finished_weight,
      newValue: newFields.finishedWeight,
      changeType: "modify",
    });
  }

  // 主料含量比系数变更
  if (newFields.ratioFactor !== undefined && newFields.ratioFactor !== oldFormula.ratio_factor) {
    changes.push({
      field: "ratioFactor",
      fieldLabel: "主料含量比系数",
      oldValue: oldFormula.ratio_factor,
      newValue: newFields.ratioFactor,
      changeType: "modify",
    });
  }

  // 辅料含量比系数变更
  if (
    newFields.supplementRatioFactor !== undefined &&
    newFields.supplementRatioFactor !== oldFormula.supplement_ratio_factor
  ) {
    changes.push({
      field: "supplementRatioFactor",
      fieldLabel: "辅料含量比系数",
      oldValue: oldFormula.supplement_ratio_factor,
      newValue: newFields.supplementRatioFactor,
      changeType: "modify",
    });
  }

  // 描述变更
  if (newFields.description !== undefined && newFields.description !== oldFormula.description) {
    changes.push({
      field: "description",
      fieldLabel: "配方描述",
      oldValue: oldFormula.description || "-",
      newValue: newFields.description || "-",
      changeType: "modify",
    });
  }

  // 找出删除和修改的原料
  for (const old of oldMaterials) {
    const newMat = newMaterials.find((m: any) => m.materialId === old.materialId);
    if (!newMat) {
      changes.push({
        field: "materials",
        fieldLabel: `原料: ${old.materialName}`,
        oldValue: old.quantity,
        newValue: null,
        changeType: "delete",
      });
    } else {
      if (old.quantity !== newMat.quantity) {
        changes.push({
          field: "materials",
          fieldLabel: `原料数量: ${old.materialName}`,
          oldValue: old.quantity,
          newValue: newMat.quantity,
          changeType: "modify",
        });
      }

      if (old.adjustedPrice !== newMat.adjustedPrice) {
        const oldPrice = old.adjustedPrice ?? "基价";
        const newPrice = newMat.adjustedPrice ?? "基价";
        changes.push({
          field: "adjustedPrice",
          fieldLabel: `原料单价: ${old.materialName}`,
          oldValue: typeof oldPrice === "number" ? `¥${oldPrice}/kg` : oldPrice,
          newValue: typeof newPrice === "number" ? `¥${newPrice}/kg` : newPrice,
          changeType: "modify",
        });
      }
    }
  }

  // 找出新增的原料
  for (const newMat of newMaterials) {
    const exists = oldMaterials.find((m: any) => m.materialId === newMat.materialId);
    if (!exists) {
      changes.push({
        field: "materials",
        fieldLabel: `原料: ${newMat.materialName}`,
        oldValue: null,
        newValue: newMat.quantity,
        changeType: "add",
      });
    }
  }

  return changes;
}

/** 根据变更数组生成有业务语义的版本名称 */
function buildVersionName(changes: any[], materialCount: number): string {
  if (!changes.length) return "配方参数微调";

  const parts: string[] = [];

  // 非原料变更
  const nonMaterialChanges = changes.filter(c => c.field !== "materials");
  const materialChanges = changes.filter(c => c.field === "materials");

  // 按字段汇总非原料变更
  const nonMaterialLabels: string[] = [];
  for (const c of nonMaterialChanges) {
    if (c.field === "name") nonMaterialLabels.push("配方名");
    else if (c.field === "salesman") nonMaterialLabels.push("业务员");
    else if (c.field === "finishedWeight") nonMaterialLabels.push("成品重量");
    else if (c.field === "ratioFactor") nonMaterialLabels.push("主料系数");
    else if (c.field === "supplementRatioFactor") nonMaterialLabels.push("辅料系数");
    else if (c.field === "description") nonMaterialLabels.push("描述");
    else if (c.field === "adjustedPrice") nonMaterialLabels.push(c.fieldLabel.replace("原料单价: ", "") + "基价");
  }
  if (nonMaterialLabels.length) {
    parts.push("修改" + nonMaterialLabels.join("、"));
  }

  // 原料变更
  const added = materialChanges.filter(c => c.changeType === "add");
  const deleted = materialChanges.filter(c => c.changeType === "delete");
  const modified = materialChanges.filter(c => c.changeType === "modify");

  if (added.length) {
    const names = added.map(c => c.fieldLabel.replace("原料: ", ""));
    parts.push(
      `新增${names.length > 2 ? names.slice(0, 2).join("、") + "等" + names.length + "种" : names.join("、")}`,
    );
  }
  if (deleted.length) {
    const names = deleted.map(c => c.fieldLabel.replace("原料: ", ""));
    parts.push(
      `删除${names.length > 2 ? names.slice(0, 2).join("、") + "等" + names.length + "种" : names.join("、")}`,
    );
  }
  if (modified.length) {
    const names = modified.map(c => c.fieldLabel.replace("原料数量: ", ""));
    parts.push(
      `调整${names.length > 2 ? names.slice(0, 2).join("、") + "等" + names.length + "项" : names.join("、") + "用量"}`,
    );
  }

  const summary = parts.join("，");
  if (summary.length > 40) {
    return summary.slice(0, 37) + "...";
  }
  return summary || "原料调整";
}

/** ratioFactor 实时校验端点 */
export async function validateFormulaRatio(req: any, res: Response) {
  try {
    const { materials, finishedWeight, ratioFactor, supplementRatioFactor } = req.body;

    // 批量查询原料类型
    const materialIds = (materials || []).map((m: any) => m.materialId).filter(Boolean);
    const materialTypeMap: Record<string, string> = {};
    if (materialIds.length > 0) {
      const placeholders = materialIds.map(() => "?").join(",");
      const [matRows]: any[] = await query(
        `SELECT id, material_type FROM materials WHERE id IN (${placeholders})`,
        materialIds,
      );
      for (const r of matRows) {
        materialTypeMap[r.id] = r.material_type || "herb";
      }
    }

    const materialsWithType = (materials || []).map((m: any) => ({
      materialId: m.materialId,
      materialName: m.materialName || "",
      quantity: m.quantity || 0,
      materialType: materialTypeMap[m.materialId] || "herb",
    }));

    const result = validateRatioFactor(
      materialsWithType,
      Number(finishedWeight) || 0,
      Number(ratioFactor) || 0.18,
      Number(supplementRatioFactor) || 1.0,
    );

    res.json(success(result));
  } catch (error: any) {
    res.status(500).json({ success: false, message: "含量比校验失败", error: error.message });
  }
}
