'use client'
import { useAuth, useConfig } from '@payloadcms/ui'

/** Signs the admin user out and opens the login page. */
export function useSignOut() {
  const { logOut } = useAuth()
  const { config } = useConfig()

  return async () => {
    await logOut()
    // Full page load: drops every cached admin view along with the session
    window.location.assign(`${config.routes.admin}/login`)
  }
}
