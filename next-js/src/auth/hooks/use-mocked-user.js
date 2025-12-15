import { useAuthContext } from './use-auth-context';
import { _mock } from 'src/_mock';

// ----------------------------------------------------------------------

export function useMockedUser() {
  try {
    const { user } = useAuthContext();
    if (user) {
      return { user };
    }
  } catch (error) {
    // Fallback to mock when outside of AuthProvider (stories/demos)
  }

  const fallbackUser = {
    id: '8864c717-587d-472a-929a-8e5f298024da-0',
    displayName: 'Jaydon Frankie',
    email: 'demo@minimals.cc',
    photoURL: _mock.image.avatar(24),
    phoneNumber: _mock.phoneNumber(1),
    country: _mock.countryNames(1),
    address: '90210 Broadway Blvd',
    state: 'California',
    city: 'San Francisco',
    zipCode: '94116',
    about: 'Praesent turpis. Phasellus viverra nulla ut metus varius laoreet. Phasellus tempus.',
    role: 'admin',
    isPublic: true,
  };

  return { user: fallbackUser };
}
