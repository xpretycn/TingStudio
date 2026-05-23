import { http, HttpResponse, delay } from 'msw'

const _TOKEN_KEY = 'tingstudio_token'

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { username: string; password: string }
    if (body.username === 'admin' && body.password === 'admin123') {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'test-token-mock-xyz',
          user: {
            id: 'u1',
            username: 'admin',
            avatar: '/avatar.jpg',
            role: 'admin'
          }
        }
      })
    }
    return HttpResponse.json(
      { success: false, message: '用户名或密码错误' },
      { status: 401 }
    )
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    if (!body.username || !body.password) {
      return HttpResponse.json(
        { success: false, message: '请填写完整信息' },
        { status: 400 }
      )
    }
    return HttpResponse.json({
      success: true,
      data: {
        token: 'test-register-token',
        user: { id: 'u-new', username: body.username as string, avatar: '', role: 'user' }
      }
    })
  }),

  http.get('/api/materials', () => {
    return HttpResponse.json({
      success: true,
      data: {
        list: [
          { id: 'm1', name: '当归', category: 'herb', status: 'active', createdAt: '2024-01-15' },
          { id: 'm2', name: '黄芪', category: 'herb', status: 'active', createdAt: '2024-02-10' },
          { id: 'm3', name: '党参', category: 'herb', status: 'inactive', createdAt: '2024-03-05' },
        ],
        total: 3
      }
    })
  }),

  http.get('/api/materials/:id', ({ params }) => {
    const { id } = params
    return HttpResponse.json({
      success: true,
      data: {
        id,
        name: `原料-${id}`,
        category: 'herb',
        nutritionData: { protein: 20.5, fat: 8.3, carbohydrate: 45.2, energy: 1418.2 },
        status: 'active'
      }
    })
  }),

  http.post('/api/materials', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      data: { id: 'm-new', ...body }
    }, { status: 201 })
  }),

  http.put('/api/materials/:id', async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      data: { id: params.id, ...body }
    })
  }),

  http.delete('/api/materials/:id', ({ params }) => {
    return HttpResponse.json({ success: true, data: { id: params.id } })
  }),

  http.get('/api/formulas', () => {
    return HttpResponse.json({
      success: true,
      data: {
        list: [
          { id: 'f1', name: '补气配方-A', code: 'BQ-001', status: 'published', versionCount: 3 },
          { id: 'f2', name: '养血配方-B', code: 'YX-002', status: 'draft', versionCount: 1 },
        ],
        total: 2
      }
    })
  }),

  http.get('/api/formulas/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        name: `配方-${params.id}`,
        code: `CODE-${params.id}`,
        materials: [{ materialId: 'm1', name: '当归', amount: 30 }],
        versions: [
          { id: 'v1', version: '1.0.0', isCurrent: false, createdAt: '2024-01-20' },
          { id: 'v2', version: '1.1.0', isCurrent: true, createdAt: '2024-02-15' },
        ]
      }
    })
  }),

  http.get('/api/salesmen', () => {
    return HttpResponse.json({
      success: true,
      data: {
        list: [
          { id: 's1', name: '张三', phone: '13800138001', region: '华东', status: 'active' },
          { id: 's2', name: '李四', phone: '13800138002', region: '华南', status: 'active' },
        ],
        total: 2
      }
    })
  }),

  http.get('/api/ai/models', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: '🟢' },
        { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic', icon: '🟠' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', icon: '🔵' },
      ]
    })
  }),

  http.post('/api/ai/chat', async () => {
    await delay(300)
    return HttpResponse.json({
      success: true,
      data: {
        content: '这是 AI 助手的模拟回复。根据您的描述，我建议...',
        model: 'gpt-4o',
        tokensUsed: 156
      }
    })
  }),

  http.get('/api/versions/formula/:formulaId', () => {
    return HttpResponse.json({
      success: true,
      data: {
        list: [
          { id: 'v1', version: '1.0.0', changelog: '初始版本', isCurrent: false, createdAt: '2024-01-20' },
          { id: 'v2', version: '1.1.0', changelog: '调整黄芪用量', isCurrent: true, createdAt: '2024-02-15' },
        ]
      }
    })
  }),

  http.get('/api/exports', () => {
    return HttpResponse.json({
      success: true,
      data: {
        list: [
          { id: 'e1', fileName: '配方导出_202404.xlsx', status: 'completed', progress: 100, createdAt: '2024-04-18' },
          { id: 'e2', fileName: '原料清单.xlsx', status: 'processing', progress: 60, createdAt: '2024-04-19' },
        ]
      }
    })
  }),

  http.get('/api/weather', () => {
    return HttpResponse.json({
      success: true,
      data: {
        city: '北京',
        temperature: 22,
        weather: '晴',
        humidity: 45,
        wind: '东北风 3级'
      }
    })
  }),
]
