import { GoogleAuth } from 'google-auth-library'
import * as fs from 'fs'

const sa = JSON.parse(fs.readFileSync('/tmp/sa.json', 'utf8'))
const projectId = sa.project_id

async function main() {
  const auth = new GoogleAuth({
    credentials: sa,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const token = (await client.getAccessToken() as { token: string }).token
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Try to enable Google IDP via the Identity Toolkit admin API.
  // First, list existing OAuth IDP configs
  const idpRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/oauthIdpConfigs`,
    { headers }
  )
  console.log('List IDP status:', idpRes.status)
  if (idpRes.ok) {
    const idp = await idpRes.json()
    console.log('Existing IDP configs:', JSON.stringify(idp, null, 2))
  } else {
    console.log('Response:', await idpRes.text())
  }

  // Check if a default OAuth client exists for this project (Firebase auto-provisions one)
  // Try creating a Google IDP config using the project's default web OAuth client
  // The default client ID format: <project-number>.apps.googleusercontent.com
  // We need the project number — fetch it via Resource Manager
  const projRes = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`, { headers })
  if (projRes.ok) {
    const proj = await projRes.json()
    console.log('Project number:', proj.projectNumber)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
