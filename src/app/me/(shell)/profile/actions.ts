'use server';

import { redirect } from 'next/navigation';
import { signOutMember } from '@/app/scan/[qrSlug]/actions';

/**
 * Wrapper around the existing `signOutMember` action that adds a post-signout
 * redirect. The scan/[qrSlug] version is reused as the cookie-clearing
 * primitive — we just need an entry point bound to the form on the profile
 * page that also routes the user back to the scan loop.
 */
export async function signOutAndRedirect() {
  await signOutMember();
  redirect('/scan');
}
