// Create a Firebase web app (if none exists) and print its client config.
// Usage: FIREBASE_SERVICE_ACCOUNT='<json>' bun run scripts/get-firebase-config.ts

import { GoogleAuth } from 'google-auth-library'

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
const projectId = sa.project_id
if (!projectId) {
  console.error('Missing project_id in service account')
  process.exit(1)
}

async function main() {
  const auth = new GoogleAuth({
    credentials: sa,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const tokenRes = await client.getAccessToken()
  const token = (tokenRes as { token: string }).token
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // 1. List web apps
  let appId: string | undefined
  const listRes = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
    { headers }
  )
  if (listRes.ok) {
    const listJson = await listRes.json()
    const apps = listJson.apps || []
    if (apps.length > 0) appId = apps[0].appId
  }

  // 2. Create a web app if none exists
  if (!appId) {
    console.error('No web app found — creating one...')
    const createRes = await fetch(
      `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ displayName: 'Aurora Web' }),
      }
    )
    if (!createRes.ok) {
      console.error('Failed to create web app:', createRes.status, await createRes.text())
      process.exit(1)
    }
    // The response is a long-running operation; poll it
    const opJson = await createRes.json()
    const opName = opJson.name
    if (opName) {
      // Poll the operation until done
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1500))
        const opRes = await fetch(`https://firebase.googleapis.com/v1beta1/${opName}`, { headers })
        if (!opRes.ok) continue
        const opStatus = await opRes.json()
        if (opStatus.done) {
          appId = opStatus.response?.appId
          break
        }
      }
    }
  }

  if (!appId) {
    console.error('Could not obtain appId')
    process.exit(1)
  }

  // 3. Get web app config (includes apiKey)
  const configRes = await fetch(
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps/${appId}/config`,
    { headers }
  )
  if (!configRes.ok) {
    console.error('Failed to get config:', configRes.status, await configRes.text())
    process.exit(1)
  }
  const config = await configRes.json()

  const out = {
    apiKey: config.apiKey,
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    appId,
    messagingSenderId: config.messagingSenderId,
    storageBucket: config.storageBucket || `${projectId}.appspot.com`,
  }
  console.log(JSON.stringify(out, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
