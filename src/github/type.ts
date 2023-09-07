import { components } from '@octokit/openapi-types'

export interface GraphQLResponse {}

export interface GraphQLRepositoryResponse extends GraphQLResponse {
  repository: Repository
}

export interface Repository {
  refs: Refs
}

export interface Refs {
  nodes: Node[]
}

export interface Node {
  name: string
  target: Target
}

export interface Target {
  oid: string
}

export type Commit = components['schemas']['commit']

export interface CommitDetails {
  message: string
}
