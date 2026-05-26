import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getVersions, getVersion, createVersion, publishVersion, compareVersions,
  submitVersion, approveVersion, rejectVersion,
  getPendingReviews, getMySubmissionList, getMySubmissionCounts, getReviewedHistory, getVersionReviewLogs,
  getMaterialUpdates, refreshSnapshot,
  setCurrentVersion,
} from '../controllers/versionController.js'

export const versionRoutes = Router()

versionRoutes.use(authMiddleware)

versionRoutes.get('/pending-review', getPendingReviews)
versionRoutes.get('/my-submissions', getMySubmissionList)
versionRoutes.get('/my-submissions/counts', getMySubmissionCounts)
versionRoutes.get('/reviewed-by-me', getReviewedHistory)
versionRoutes.get('/formula/:formulaId', getVersions)
versionRoutes.get('/detail/:versionId', getVersion)
versionRoutes.get('/review-logs/:versionId', getVersionReviewLogs)
versionRoutes.get('/material-updates/:formulaId', getMaterialUpdates)
versionRoutes.get('/compare/:formulaId', compareVersions)

versionRoutes.post('/formula/:formulaId', createVersion)
versionRoutes.post('/submit/:versionId', submitVersion)
versionRoutes.post('/refresh-snapshot/:formulaId', refreshSnapshot)

versionRoutes.put('/publish/:versionId', publishVersion)
versionRoutes.put('/approve/:versionId', approveVersion)
versionRoutes.put('/reject/:versionId', rejectVersion)
versionRoutes.put('/set-current/:versionId', setCurrentVersion)
