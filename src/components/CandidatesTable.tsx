import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { cn } from '../lib/utils'
import { SearchInput } from './SearchInput'
import type { Candidate, FuseSearchResult } from '../lib/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fetchCandidates, searchCandidates } from '@/lib/api'

export const CandidatesTable: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('Haa')
  const {
    data: s3Candidates = [],
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['fetchCandidates'],
    queryFn: fetchCandidates,
  })

  const searchResults = useMemo(() => {
    console.log('searching', s3Candidates)

    if (!searchQuery) return new Map()

    const results = searchCandidates(s3Candidates, searchQuery)
    console.log('res', results)

    return results
  }, [s3Candidates, searchQuery])

  const handleSearch = (query: string) => {
    setSearchQuery(query.trim())
  }

  const getPartyColor = (partyName: string) => {
    const colors: Record<string, string> = {
      'ISAMAA Erakond': 'bg-blue-100 text-blue-800',
      'Eesti Reformierakond': 'bg-yellow-100 text-yellow-800',
      'Eesti Keskerakond': 'bg-green-100 text-green-800',
      'Sotsiaaldemokraatlik Erakond': 'bg-red-100 text-red-800',
      'Eesti Konservatiivne Rahvaerakond': 'bg-purple-100 text-purple-800',
      'Erakond Eesti 200': 'bg-amber-100 text-amber-800',
      Üksikkandidaadid: 'bg-gray-100 text-gray-800',
    }

    return colors[partyName] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load candidates: {error.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  console.log('seaaaaa', searchResults)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Leia endale sobiv kandidaat
          </h1>
          <p className="text-muted-foreground">
            {s3Candidates.length.toLocaleString()} kandidaati
          </p>
        </div>
      </div>

      {/* Search */}
      <SearchInput
        onSearch={handleSearch}
        placeholder="Search by name, party, or location..."
        className="max-w-md"
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead className="w-[100px]">Kandidaadi nimi</TableHead>
              <TableHead className="w-[60px]">Vanus</TableHead>
              <TableHead className="w-[80px]">Haridus</TableHead>
              <TableHead className="w-[60px]">2021 hääled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searchResults.size === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={searchQuery ? 4 : 3}
                  className="h-24 text-center"
                >
                  {searchQuery
                    ? 'No candidates found matching your search.'
                    : 'No candidates available.'}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {Array.from(searchResults.entries()).map(
                  ([district, adminUnits]: [
                    string,
                    Map<string, Array<Candidate>>,
                  ]) => {
                    return (
                      <div key={district}>
                        <h2 className="text-3xl font-semibold">{district}</h2>

                        {Array.from(adminUnits.entries()).map(
                          ([adminUnit, parties]: [any, any]) => {
                            return (
                              <>
                                <h2 className="text-lg opacity-80">
                                  {adminUnit}
                                </h2>

                                {Array.from(parties.entries()).map(
                                  ([partyName, candidates]: any) => (
                                    <div key={partyName}>
                                      <h3
                                        className={cn(
                                          'text-2xl',
                                          getPartyColor(partyName),
                                        )}
                                      >
                                        {partyName} ({candidates.length})
                                      </h3>
                                      {candidates.map(
                                        (candidate: any, index: any) => {
                                          if (index > 4) {
                                            return <></>
                                          }
                                          return (
                                            <TableRow
                                              key={`${candidate.name}-${index}`}
                                            >
                                              <TableCell>
                                                <div className="flex items-center space-x-1">
                                                  <span>
                                                    {
                                                      candidate.candidateRegNumber
                                                    }
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="font-medium">
                                                <div className="font-semibold">{`${candidate.name}`}</div>
                                              </TableCell>
                                              <TableCell className="font-medium">
                                                <Badge
                                                  variant="outline"
                                                  className="text-sm font-semibold"
                                                >
                                                  {candidate.age}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="font-medium">
                                                <div className="font-semibold">{`${candidate.education}`}</div>
                                              </TableCell>
                                              <TableCell className="font-medium">
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs"
                                                >
                                                  {candidate.lastNumberOfVotes}
                                                </Badge>
                                              </TableCell>
                                            </TableRow>
                                          )
                                        },
                                      )}
                                    </div>
                                  ),
                                )}
                              </>
                            )
                          },
                        )}
                      </div>
                    )
                  },
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination info */}
      {!searchQuery && s3Candidates.length > 100 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing first 100 candidates. Use search to find specific candidates.
        </p>
      )}
    </div>
  )
}
