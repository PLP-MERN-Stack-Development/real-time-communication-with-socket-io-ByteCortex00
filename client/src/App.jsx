// client/src/App.jsx - UPDATED WITH BETTER LAYOUT
import { useUser, useAuth, SignIn, SignUp, UserButton } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'
import { ChatInterface } from './components/ChatInterface'
import './App.css'

function App() {
  const { isSignedIn, user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [socketAuth, setSocketAuth] = useState(null)

  // Prepare socket authentication data when user is signed in
  useEffect(() => {
    const prepareSocketAuth = async () => {
      if (isSignedIn && user) {
        try {
          const token = await getToken()
          setSocketAuth({
            username: user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'Anonymous',
            userId: user.id,
            clerkUserId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            avatar: user.imageUrl,
            token: token
          })
        } catch (error) {
          console.error('Error preparing socket auth:', error)
        }
      }
    }

    if (isLoaded) {
      prepareSocketAuth()
    }
  }, [isSignedIn, user, isLoaded, getToken])

  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading authentication...</p>
      </div>
    )
  }

  // Show Clerk sign-in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="auth-container">
        <div className="auth-content">
          <div className="auth-header">
            <h1>💬 Socket.io Chat</h1>
            <p>Secure real-time messaging with Clerk authentication</p>
          </div>
          
          {/* Clerk SignIn Component */}
          <div className="auth-tabs">
            <SignIn 
              routing="virtual"
              redirectUrl="/"
              signUpUrl="/sign-up"
              appearance={{
                elements: {
                  rootBox: 'cl-rootBox',
                  card: 'cl-card',
                  header: 'cl-header',
                  headerTitle: 'cl-headerTitle',
                  headerSubtitle: 'cl-headerSubtitle',
                  formField: 'cl-formField',
                  formFieldLabel: 'cl-formFieldLabel',
                  formFieldInput: 'cl-formFieldInput',
                  formButtonPrimary: 'cl-formButtonPrimary',
                  footerAction: 'cl-footerAction',
                  footerActionLink: 'cl-footerActionLink',
                  dividerLine: 'cl-dividerLine',
                  dividerText: 'cl-dividerText',
                  socialButtons: 'cl-socialButtons',
                  socialButtonsBlockButton: 'cl-socialButtonsBlockButton'
                }
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Show chat interface when authenticated
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>💬 Socket.io Chat</h1>
          <span className="app-subtitle">Secure Real-time Messaging</span>
        </div>
        
        <div className="header-right">
          <div className="user-welcome">
            Welcome, {user.fullName || user.primaryEmailAddress?.emailAddress}!
          </div>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8",
                userButtonTrigger: "cl-userButtonTrigger"
              }
            }}
          />
        </div>
      </header>
      
      {socketAuth && (
        <ChatInterface userAuth={socketAuth} />
      )}
    </div>
  )
}

export default App