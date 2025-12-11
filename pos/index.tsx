import { useEffect } from 'react'
import { syncOrdersToServer } from '../../lib/offlineDB'

const POSPage = () => {

  useEffect(() => {
    const handleOnline = () => {
      console.log('Back online! Syncing orders...')
      syncOrdersToServer()
    }

    window.addEventListener('online', handleOnline)

    // Cleanup
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return <div>POS Page</div>
}

export default POSPage
