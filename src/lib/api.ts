import axios from 'axios'
import Fuse from 'fuse.js'
import type { Candidate, FuseSearchResult } from './types'

const MINIO_CONFIG = {
  endpoint: 'http://localhost:9000',
  bucket: 'candidates2',
  indexFile: 'fuse-index.json',
}

const api = axios.create({
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
})

export const fetchCandidates = async (): Promise<Array<Candidate>> => {
  try {
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/${MINIO_CONFIG.indexFile}`

    const response = await api.get(url)

    console.log('✅ Axios response status:', response.status)
    console.log(
      '📊 Data length:',
      Array.isArray(response.data) ? response.data.length : 'not array',
    )

    console.log(response.data)

    if (!Array.isArray(response.data)) {
      throw new Error('Response data is not a valid array')
    }

    return response.data
  } catch (error) {
    console.error('❌ Axios fetch error:', error)

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          'Connection refused: Is MinIO running on localhost:9000?',
        )
      }

      if (error.response) {
        throw new Error(
          `Server error ${error.response.status}: ${error.response.statusText}`,
        )
      }

      if (error.request) {
        throw new Error('No response from server. Check MinIO connection.')
      }
    }

    throw error
  }
}

export const fetchCandidateDetails = async (
  candidateFileName: string,
): Promise<any> => {
  try {
    // candidateFileName looks like "CANDIDATES/ANTI KALJUMÄE.json"
    const url = `${MINIO_CONFIG.endpoint}/${MINIO_CONFIG.bucket}/${candidateFileName}`

    console.log('🔄 Fetching candidate details from:', url)

    const response = await api.get(url)

    console.log('✅ Candidate details loaded for:', candidateFileName)

    return response.data
  } catch (error) {
    console.error(
      `❌ Failed to fetch candidate details for ${candidateFileName}:`,
      error,
    )

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Candidate file not found: ${candidateFileName}`)
      }

      throw new Error(
        `Failed to load candidate: ${error.response?.statusText || error.message}`,
      )
    }

    throw error
  }
}

export const groupResults = (items: Array<FuseSearchResult>) => {
  const grouped = new Map()

  items.forEach(({ item }) => {
    const district = item.district || 'No District'
    const adminUnit = item.adminUnit || 'No Admin Unit'
    const party = item.partyName || 'No Party'

    if (!grouped.has(district)) {
      grouped.set(district, new Map())
    }

    const districtMap = grouped.get(district)
    if (!districtMap.has(adminUnit)) {
      districtMap.set(adminUnit, new Map())
    }

    const adminUnitMap = districtMap.get(adminUnit)
    if (!adminUnitMap.has(party)) {
      adminUnitMap.set(party, [])
    }

    adminUnitMap.get(party).push(item)
  })

  return grouped
}

export const searchCandidates = (
  candidates: Array<Candidate>,
  query: string,
) => {
  if (!query || query.length < 2) return new Map()

  const fuse = new Fuse(candidates, {
    // keys: [
    //   { name: 'name', weight: 0.8 },
    //   { name: 'partyName', weight: 0.3 },
    //   { name: 'district', weight: 0.3 },
    // ],
    keys: ['name', 'partyName', 'adminUnit', 'district'],
    shouldSort: true,
    threshold: 0.1,
    includeScore: false,
    includeMatches: false,
    findAllMatches: false,
  })

  const data = fuse.search(query)

  console.log('fuse data', data)

  const results = groupResults(data)
  console.log('grouped', results)

  return results
}
