/**
 * Apollo Client configured for the FarmPulse GraphQL backend.
 * Auth: Django graphql-jwt — Bearer token in Authorization header.
 * Token is stored in AsyncStorage and read on each request.
 */
import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── endpoint ─────────────────────────────────────────────────────────────────
// Dev: Django runs on :8000. For Android emulator use 10.0.2.2 instead of localhost.
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const GRAPHQL_URL =
  process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL}/graphql/`
    : `http://${DEV_HOST}:8000/graphql/`;

export const TOKEN_KEY = 'farm_jwt';
export const REFRESH_KEY = 'farm_refresh';
export const USER_KEY = 'farm_user';

// ── auth storage helpers ──────────────────────────────────────────────────────
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function saveAuth(token: string, refresh: string, user: object) {
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(REFRESH_KEY, refresh),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);
}
export async function clearAuth() {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}
export async function getSavedUser(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── auth link — injects JWT on every request ──────────────────────────────────
const authLink = new ApolloLink((operation, forward) => {
  return new (require('@apollo/client').Observable)((observer: any) => {
    getToken().then(token => {
      operation.setContext(({ headers = {} }: any) => ({
        headers: {
          ...headers,
          ...(token ? { Authorization: `JWT ${token}` } : {}),
        },
      }));
      const sub = forward(operation).subscribe(observer);
      return () => sub.unsubscribe();
    });
  });
});

// ── http link ─────────────────────────────────────────────────────────────────
const httpLink = createHttpLink({ uri: GRAPHQL_URL });

// ── error link ────────────────────────────────────────────────────────────────
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      console.warn('[GQL]', err.message);
    }
  }
  if (networkError) console.warn('[Network]', networkError);
});

// ── client ────────────────────────────────────────────────────────────────────
export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only' },
  },
});
