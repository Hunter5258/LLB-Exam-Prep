import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/UI'
import { HomePage, SubjectOverviewPage, SubjectsPage } from '@/features/dashboard'
import { SyllabusPage, TopicRoute } from '@/features/syllabus'
import { PaperDetailPage, PapersPage } from '@/features/papers'
import { PracticePage, QuestionBankPage, QuestionDetailPage } from '@/features/questions'
import { InsightsPage, PredictionRoute, PredictionsPage } from '@/features/predictions'
import { RevisionCentrePage, SubjectRevisionPage } from '@/features/revision'
import { BookmarksPage, HistoryPage, NotesPage, SearchPage } from '@/features/personal'
import { SettingsPage } from '@/features/settings'

function Wrapped({ render, extra }: { render: (subjectId: string, extra?: string) => ReactNode; extra?: string }) {
  const params = useParams()
  return <>{render(params.subjectId ?? '', extra ? params[extra] : undefined)}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell><Outlet /></AppShell>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/subjects" element={<SubjectsPage />} />
        <Route path="/subjects/:subjectId" element={<Wrapped render={(id) => <SubjectOverviewPage subjectId={id} />} />} />
        <Route path="/subjects/:subjectId/syllabus" element={<Wrapped render={(id) => <SyllabusPage subjectId={id} />} />} />
        <Route path="/subjects/:subjectId/topics/:topicId" element={<TopicRoute />} />
        <Route path="/subjects/:subjectId/papers" element={<Wrapped render={(id) => <PapersPage subjectId={id} />} />} />
        <Route path="/subjects/:subjectId/papers/:paperId" element={<Wrapped extra="paperId" render={(id, paperId) => <PaperDetailPage subjectId={id} paperId={paperId} />} />} />
        <Route path="/subjects/:subjectId/questions" element={<Wrapped render={(id) => <QuestionBankPage subjectId={id} />} />} />
        <Route path="/subjects/:subjectId/questions/:questionId" element={<Wrapped extra="questionId" render={(id, questionId) => <QuestionDetailPage subjectId={id} questionId={questionId} />} />} />
        <Route path="/subjects/:subjectId/predictions" element={<Wrapped render={(id) => <PredictionsPage subjectId={id} />} />} />
        <Route path="/subjects/:subjectId/predictions/:predictionId" element={<PredictionRoute />} />
        <Route path="/subjects/:subjectId/insights" element={<Wrapped render={(id) => <InsightsPage subjectId={id} />} />} />
        <Route path="/subjects/:subjectId/revision" element={<Wrapped render={(id) => <SubjectRevisionPage subjectId={id} />} />} />
        <Route path="/subjects/:subjectId/practice/:targetType/:targetId" element={<Wrapped render={(id) => <PracticePage subjectId={id} />} />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/revision" element={<RevisionCentrePage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/backup" element={<Navigate to="/settings" replace />} />
        <Route path="*" element={<EmptyState title="Page not found" message="The address may be incorrect or the record may not exist."
          action={<Link to="/" className="btn btn--primary">Return home</Link>} />} />
      </Route>
    </Routes>
  )
}
