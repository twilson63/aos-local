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
  }).then(res => {
    if (!res.ok) throw new Error(`loadEnv: process fetch failed ${res.status} ${res.statusText}`)
    return res.json()
  })
    .then(res => res.data?.transactions?.edges?.[0]?.node)
    .then(async process => {
      if (!process) throw new Error('loadEnv: process not found')

      process.owner = process.owner.address
      if (process.owner == "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY") {
        process.owner = process.tags.find(t => t.name === "From-Process")?.value
      }
      const mid = process.tags.find(t => t.name === "Module")?.value
      if (!mid) throw new Error('loadEnv: module tag not found on process')

      const modRes = await fetch(`https://arweave-search.goldsky.com/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
    query {
      transactions(ids: ["${mid}"]) {
        edges {
          node {
            id,
            owner { address },
            tags { name, value }
          }
        }
      }
    }`
        })
      })
      if (!modRes.ok) throw new Error(`loadEnv: module fetch failed ${modRes.status} ${modRes.statusText}`)
      const modJson = await modRes.json()
      const module = modJson?.data?.transactions?.edges?.[0]?.node
      if (!module) throw new Error('loadEnv: module not found')

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