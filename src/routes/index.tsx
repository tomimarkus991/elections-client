import { createFileRoute } from '@tanstack/react-router'

import { CandidatesTable } from '../components/CandidatesTable'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="py-8 px-4">
      <CandidatesTable />
    </div>
  )
}
