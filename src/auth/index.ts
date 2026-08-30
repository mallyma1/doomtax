import { hashNonce } from '@/auth/wallet/client-helpers';
import { MiniKit } from '@worldcoin/minikit-js';
import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js/commands';
import { verifySiweMessage } from '@worldcoin/minikit-js/siwe';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface User {
    walletAddress: string;
    username: string;
    profilePictureUrl: string;
  }

  interface Session {
    user: {
      walletAddress: string;
      username: string;
      profilePictureUrl: string;
    } & DefaultSession['user'];
  }
}

// Auth configuration for Wallet Auth based sessions
// For more information on each option (and a full list of options) go to
// https://authjs.dev/getting-started/authentication/credentials
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  /*
   * Vercel gives every preview deployment its own hostname, and Auth.js
   * refuses a host it was not told to trust:
   *
   *   [auth][error] UntrustedHost: Host must be trusted. URL was:
   *   https://doomtax-git-<branch>-doomtax.vercel.app/api/auth/session
   *
   * That 500s /api/auth/session and logs on every page render, so sign-in is
   * broken on every preview — the deployments used to demo the app. Trusting
   * the host on Vercel is safe: the platform terminates TLS and sets the Host
   * header itself, so it is not attacker-controlled. AUTH_TRUST_HOST still
   * works for anywhere else this runs behind a proxy.
   */
  trustHost: process.env.AUTH_TRUST_HOST === 'true' || !!process.env.VERCEL,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'World App Wallet',
      credentials: {
        nonce: { label: 'Nonce', type: 'text' },
        signedNonce: { label: 'Signed Nonce', type: 'text' },
        finalPayloadJson: { label: 'Final Payload', type: 'text' },
      },
      // @ts-expect-error — NextAuth v5 Credentials authorize typing is overly narrow; cast is safe
      authorize: async ({
        nonce,
        signedNonce,
        finalPayloadJson,
      }: {
        nonce: string;
        signedNonce: string;
        finalPayloadJson: string;
      }) => {
        const expectedSignedNonce = hashNonce({ nonce });

        if (signedNonce !== expectedSignedNonce) {
          return null;
        }

        const finalPayload: MiniAppWalletAuthSuccessPayload =
          JSON.parse(finalPayloadJson);
        const result = await verifySiweMessage(finalPayload, nonce);

        if (!result.isValid || !result.siweMessageData.address) {
          return null;
        }
        // Optionally, fetch the user info from your own database
        const userInfo = await MiniKit.getUserInfo(finalPayload.address);

        return {
          id: finalPayload.address,
          ...userInfo,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.walletAddress = user.walletAddress;
        token.username = user.username;
        token.profilePictureUrl = user.profilePictureUrl;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.walletAddress = token.address as string;
        session.user.username = token.username as string;
        session.user.profilePictureUrl = token.profilePictureUrl as string;
      }

      return session;
    },
  },
});
