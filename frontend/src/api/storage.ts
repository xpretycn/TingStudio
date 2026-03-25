import type { User, LoginForm, RegisterForm } from '@/types/user'
import type { Customer, CustomerForm } from '@/types/customer'
import type { Material, MaterialForm, MaterialUsage } from '@/types/material'
import type { Formula, FormulaForm, MaterialItem } from '@/types/formula'
import { getTimestamp } from '@/utils/timeFormat'

const STORAGE_KEYS = {
  USERS: 'tingstudio_users',
  CURRENT_USER: 'tingstudio_current_user',
  CUSTOMERS: 'tingstudio_customers',
  MATERIALS: 'tingstudio_materials',
  FORMULAS: 'tingstudio_formulas'
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

class StorageService {
  private ensureTestUser(): void {
    const users = this.getUsers()
    if (!users.some(u => u.username === 'user001')) {
      users.push({
        id: 'test_user_001',
        username: 'user001',
        password: 'user001',
        createdAt: getTimestamp()
      } as any)
      this.setUsers(users)
    }
  }

  private getUsers(): User[] {
    const data = localStorage.getItem(STORAGE_KEYS.USERS)
    return data ? JSON.parse(data) : []
  }

  private setUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
  }

  private fetchCustomers(): Customer[] {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS)
    return data ? JSON.parse(data) : []
  }

  private setCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers))
  }

  private fetchMaterials(): Material[] {
    const data = localStorage.getItem(STORAGE_KEYS.MATERIALS)
    return data ? JSON.parse(data) : []
  }

  private setMaterials(materials: Material[]): void {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials))
  }

  private fetchFormulas(): Formula[] {
    const data = localStorage.getItem(STORAGE_KEYS.FORMULAS)
    return data ? JSON.parse(data) : []
  }

  private setFormulas(formulas: Formula[]): void {
    localStorage.setItem(STORAGE_KEYS.FORMULAS, JSON.stringify(formulas))
  }

  // 用户相关
  register(registerForm: RegisterForm): User {
    const users = this.getUsers()
    const exists = users.find(u => u.username === registerForm.username)
    if (exists) {
      throw new Error('用户名已存在')
    }

    const user: User = {
      id: generateId(),
      username: registerForm.username,
      createdAt: getTimestamp()
    }

    // 存储用户（实际项目中应该加密密码）
    users.push({
      ...user,
      password: registerForm.password
    } as any)

    this.setUsers(users)
    return user
  }

  login(loginForm: LoginForm): User {
    this.ensureTestUser()
    const users = this.getUsers()
    const user = users.find(
      u => u.username === loginForm.username
      // u => u.username === loginForm.username && (u as any).password === loginForm.password
    )

    if (!user) {
      throw new Error('用户名或密码错误')
    }

    const { password, ...userWithoutPassword } = user
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword))
    return userWithoutPassword
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
  }

  getCurrentUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    return data ? JSON.parse(data) : null
  }

  // 客户相关
  getCustomers(userId: string): Customer[] {
    const customers = this.fetchCustomers()
    return customers.filter(c => c.createdBy === userId)
  }

  getCustomer(id: string): Customer | null {
    const customers = this.fetchCustomers()
    return customers.find(c => c.id === id) || null
  }

  createCustomer(userId: string, form: CustomerForm): Customer {
    const customers = this.fetchCustomers()
    const customer: Customer = {
      id: generateId(),
      ...form,
      createdBy: userId,
      createdAt: getTimestamp()
    }
    customers.push(customer)
    this.setCustomers(customers)
    return customer
  }

  updateCustomer(id: string, form: Partial<CustomerForm>): Customer | null {
    const customers = this.fetchCustomers()
    const index = customers.findIndex(c => c.id === id)
    if (index === -1) return null

    customers[index] = { ...customers[index], ...form, updatedAt: getTimestamp() }
    this.setCustomers(customers)
    return customers[index]
  }

  deleteCustomer(id: string): boolean {
    const customers = this.fetchCustomers()
    const index = customers.findIndex(c => c.id === id)
    if (index === -1) return false

    // 级联删除关联的配方
    const formulas = this.fetchFormulas()
    const filteredFormulas = formulas.filter(f => f.customerId !== id)
    this.setFormulas(filteredFormulas)

    customers.splice(index, 1)
    this.setCustomers(customers)
    return true
  }

  // 配方相关
  getFormulas(userId: string): Formula[] {
    const formulas = this.fetchFormulas()
    return formulas.filter(f => f.createdBy === userId)
  }

  getFormula(id: string): Formula | null {
    const formulas = this.fetchFormulas()
    return formulas.find(f => f.id === id) || null
  }

  createFormula(userId: string, form: FormulaForm): Formula {
    const customers = this.getCustomers()
    const customer = customers.find(c => c.id === form.customerId)
    if (!customer) {
      throw new Error('客户不存在')
    }

    const materials = this.getMaterials()
    const materialItems: MaterialItem[] = form.materials.map(m => {
      const material = materials.find(mat => mat.id === m.materialId)
      return {
        materialId: m.materialId,
        materialName: material?.name || '',
        quantity: m.quantity
      }
    })

    const formulas = this.getFormulas()
    const formula: Formula = {
      id: generateId(),
      name: form.name,
      customerId: form.customerId,
      customerName: customer.name,
      materials: materialItems,
      description: form.description,
      createdBy: userId,
      createdAt: getTimestamp()
    }

    formulas.push(formula)
    this.setFormulas(formulas)
    return formula
  }

  updateFormula(id: string, form: Partial<FormulaForm>): Formula | null {
    const formulas = this.fetchFormulas()
    const index = formulas.findIndex(f => f.id === id)
    if (index === -1) return null

    const existingFormula = formulas[index]
    const updateData: Partial<Formula> = { ...form }

    // 更新客户名称
    if (form.customerId) {
      const customers = this.fetchCustomers()
      const customer = customers.find(c => c.id === form.customerId)
      if (customer) {
        updateData.customerName = customer.name
      }
    }

    // 更新原料名称
    if (form.materials) {
      const materials = this.fetchMaterials()
      updateData.materials = form.materials.map(m => {
        const material = materials.find(mat => mat.id === m.materialId)
        return {
          materialId: m.materialId,
          materialName: material?.name || '',
          quantity: m.quantity
        }
      })
    }

    formulas[index] = { ...existingFormula, ...updateData }
    this.setFormulas(formulas)
    return formulas[index]
  }

  deleteFormula(id: string): boolean {
    const formulas = this.fetchFormulas()
    const index = formulas.findIndex(f => f.id === id)
    if (index === -1) return false

    formulas.splice(index, 1)
    this.setFormulas(formulas)
    return true
  }

  // 原料相关
  getMaterials(userId: string): Material[] {
    const materials = this.fetchMaterials()
    return materials.filter(m => m.createdBy === userId)
  }

  getMaterial(id: string): Material | null {
    const materials = this.fetchMaterials()
    return materials.find(m => m.id === id) || null
  }

  createMaterial(userId: string, form: MaterialForm): Material {
    const materials = this.fetchMaterials()
    const material: Material = {
      id: generateId(),
      ...form,
      createdBy: userId,
      createdAt: getTimestamp()
    }
    materials.push(material)
    this.setMaterials(materials)
    return material
  }

  updateMaterial(id: string, form: Partial<MaterialForm>): Material | null {
    const materials = this.fetchMaterials()
    const index = materials.findIndex(m => m.id === id)
    if (index === -1) return null

    materials[index] = { ...materials[index], ...form, updatedAt: getTimestamp() }
    this.setMaterials(materials)
    return materials[index]
  }

  deleteMaterial(id: string): boolean {
    const materials = this.fetchMaterials()
    const index = materials.findIndex(m => m.id === id)
    if (index === -1) return false

    // 检查是否有配方使用该原料
    const formulas = this.fetchFormulas()
    const usedInFormulas = formulas.some(f =>
      f.materials.some(m => m.materialId === id)
    )

    if (usedInFormulas) {
      throw new Error('该原料正在被配方使用，无法删除')
    }

    materials.splice(index, 1)
    this.setMaterials(materials)
    return true
  }

  // 关联查询
  getFormulasByCustomer(customerId: string): Formula[] {
    const formulas = this.fetchFormulas()
    return formulas.filter(f => f.customerId === customerId)
  }

  getFormulasByMaterial(materialId: string): Formula[] {
    const formulas = this.fetchFormulas()
    return formulas.filter(f =>
      f.materials.some(m => m.materialId === materialId)
    )
  }

  getMaterialUsage(userId: string): MaterialUsage[] {
    const materials = this.fetchMaterials().filter(m => m.createdBy === userId)
    const formulas = this.fetchFormulas().filter(f => f.createdBy === userId)

    const usage: MaterialUsage[] = materials.map(material => {
      const count = formulas.filter(f =>
        f.materials.some(m => m.materialId === material.id)
      ).length

      return {
        materialId: material.id,
        materialName: material.name,
        usageCount: count
      }
    })

    return usage
  }
}

export const storageService = new StorageService()
