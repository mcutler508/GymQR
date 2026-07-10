'use server';

import { resetPasscodeWithToken } from '@/lib/auth-member';
import { setMemberCookie } from '@/lib/member-cookie';

export async function resetPasscodeAction(input: {
  token: string;
  passcode: string;
}): Promise<{ id: string; name: string }> {
  const m = await resetPasscodeWithToken(input);
  await setMemberCookie(m.id);
  return { id: m.id, name: m.name };
}
