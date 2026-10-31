
export const pageAliases={'/developer':'/api-mcp','/indexing':'/google-indexer','/sign-in':'/login','/create-account':'/register','/dashboard':'/app'};
export const toolWorkspaces={'api-mcp':'developer','google-indexer':'indexing'};
export function canonicalPagePath(name){return ({developer:'api-mcp',indexing:'google-indexer','sign-in':'login','create-account':'register',dashboard:'app'})[name]||name;}
export function workspaceRoute(name){return toolWorkspaces[name]||name;}
