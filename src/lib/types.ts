export interface Candidate {
  name: string
  partyName: string
  candidateRegNumber: number
  lastNumberOfVotes: string
  education: string
  age: string
  adminUnit: string
  district: string
}

export interface FuseSearchResult {
  item: Candidate
  score?: number
}
