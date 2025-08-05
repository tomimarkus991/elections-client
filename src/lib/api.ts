import axios from 'axios'
import Fuse from 'fuse.js'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../env'
import type { Candidate, FuseSearchResult } from './types'

// const CONFIG = {
//   endpoint: 'http://localhost:9000',
//   bucket: 'candidates2',
//   indexFile: 'fuse-index.json',
// }

const CONFIG = {
  endpoint: 'https://s3.eu-north-1.amazonaws.com',
  bucket: 'ee-test-elections-worker',
  indexFile: 'fuse-index.json',
  region: 'eu-north-1',
}

const s3Client = new S3Client({
  region: CONFIG.region,
  credentials: {
    accessKeyId: env.VITE_S3_ACCESS_KEY,
    secretAccessKey: env.VITE_S3_SECRET_KEY,
  },
  // You can omit credentials if using presigned URLs from your backend
})

// // env-specific stream with added mixin methods.
// const bodyStream = getObjectResult.Body

// // one-time transform.
// const bodyAsString = await bodyStream.transformToString()

// // throws an error on 2nd call, stream cannot be rewound.
// const __error__ = await bodyStream.transformToString()

const api = axios.create({
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
})

export const fetchCandidates = async (): Promise<Array<Candidate>> => {
  try {
    const command = new GetObjectCommand({
      Bucket: CONFIG.bucket,
      Key: CONFIG.indexFile,
    })

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    })

    // const url = `${CONFIG.endpoint}/${CONFIG.bucket}/${CONFIG.indexFile}`

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
    const url = `${CONFIG.endpoint}/${CONFIG.bucket}/${candidateFileName}`

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

  const results = groupResults(data)

  return results
}
