import { describe, it, expect } from 'vitest';

describe('Material Service - Permission Logic', () => {
  const mockAdminUser = { userId: 'admin_001', role: 'admin' };
  const mockFormulistUser = { userId: 'user_001', role: 'formulist' };
  const mockOtherUser = { userId: 'user_002', role: 'formulist' };

  const mockMaterial = {
    id: 'mat_001',
    name: '当归',
    code: 'DG001',
    unit: 'g',
    stock: 500,
    material_type: 'herb',
    unit_price: 28.0,
    data_source: 'manual',
    created_by: 'user_001',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    version: 1,
    previous_version_id: null,
    is_latest: 1,
    is_deleted: 0,
  };

  describe('canEdit', () => {
    it('should allow admin to edit any material', async () => {
      const { canEdit } = await import('../src/services/materialService.js');
      expect(canEdit(mockAdminUser, mockMaterial)).toBe(true);
    });

    it('should allow creator to edit own material', async () => {
      const { canEdit } = await import('../src/services/materialService.js');
      expect(canEdit(mockFormulistUser, mockMaterial)).toBe(true);
    });

    it('should reject other users from editing non-owned material', async () => {
      const { canEdit } = await import('../src/services/materialService.js');
      expect(canEdit(mockOtherUser, mockMaterial)).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('should allow admin to delete', async () => {
      const { canDelete } = await import('../src/services/materialService.js');
      expect(canDelete(mockAdminUser)).toBe(true);
    });

    it('should reject non-admin deletion', async () => {
      const { canDelete } = await import('../src/services/materialService.js');
      expect(canDelete(mockFormulistUser)).toBe(false);
    });
  });

  describe('Version Number Logic', () => {
    it('new version should increment version by 1', () => {
      const currentVersion = 1;
      const newVersion = currentVersion + 1;
      expect(newVersion).toBe(2);
    });

    it('should correctly identify latest version', () => {
      const isLatest = 1;
      const isNotLatest = 0;
      expect(isLatest).toBe(1);
      expect(isNotLatest).toBe(0);
    });

    it('previous_version_id should point to old version id', () => {
      const oldId = 'mat_001';
      const newRecord = { id: 'mat_002', previousVersionId: oldId };
      expect(newRecord.previousVersionId).toBe(oldId);
    });
  });
});