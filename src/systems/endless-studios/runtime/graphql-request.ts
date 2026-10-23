// Stand-in for the `graphql-request` package, which copied components import for the `gql` tag. Queries never leave
// the prototype; `GraphQLClient` answers from the screen's sample responses like `$graphqlRequest`.
export type RequestDocument = string;
export type Variables = Record<string, unknown>;

export function gql(chunks: TemplateStringsArray, ...values: unknown[]): string {
  return chunks.reduce((text, chunk, index) => text + chunk + (index < values.length ? String(values[index]) : ''), '');
}

export class ClientError extends Error {}

export class GraphQLClient {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
  async request(): Promise<Record<string, never>> {
    console.warn('[Endless Studios] GraphQLClient.request is not stood in; use $graphqlRequest or useGraphQLQuery');
    return {};
  }
}
