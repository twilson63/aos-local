export function loadEnv(pid) {
  return fetch(`https://arweave-goldsky.arweave.net/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
query {
  transactions(ids: ["${pid}"]) {
    edges {
      node {
        id,
        owner {
          address
        },
        tags {
          name,
          value
        }
      }
    }
  }
}
      
      `
    })
  }).then(res => res.json())
    .then(res => res.data?.transactions?.edges[0]?.node)
    .then(async process => {
      
      process.owner = process.owner.address
      if (process.owner == "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY") {
        process.owner = process.tags.find(t => t.name === "From-Process")?.value
      }
      // get module
      const mid = process.tags.find(t => t.name === "Module")?.value
      const module = await fetch(`https://arweave-search.goldsky.com/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
    query {
      transactions(ids: ["${mid}"]) {
        edges {
          node {
            id,
            owner {
              address
            },
            tags {
              name,
              value
            }
          }
        }
      }
    }`
      })       
    })
    .then(res => res.json())
    .then(res => res.data?.transactions?.edges[0]?.node)
    module.owner = module.owner.address
    return { Process: capitalizeKeys(process), Module: capitalizeKeys(module) }
  })

}

function capitalizeKeys(obj) {
  const newObj = {};
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      newObj[capitalizedKey] = obj[key];
    }
  }
  return newObj;
}